import {
  ForbiddenException,
  Logger,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { Type } from 'class-transformer';
import { IsDefined, IsInt } from 'class-validator';
import { Server, Socket } from 'socket.io';

import { DeliveriesService } from './deliveries.service';
import { UpdateMyDeliveryLocationDto } from './dto';
import { DeliveryTrackingLogDto } from './dto/delivery-tracking-log.dto';
import { DELIVERY_STATUS } from '../../common/constants/delivery-status';
import { Role } from '../../common/enums/role.enum';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { extractSocketToken, isJwtFormat, previewSocketToken } from '../auth/socket-token.util';

type AuthenticatedSocket = Socket & {
  data: {
    user?: AuthenticatedUser;
  };
};

class JoinTrackingPayload {
  @IsDefined()
  @Type(() => Number)
  @IsInt()
  orderId!: number;
}

const DELIVERY_TRACKING_SOCKET_PORT = Number(process.env.DELIVERY_TRACKING_SOCKET_PORT ?? 7005);

@WebSocketGateway(DELIVERY_TRACKING_SOCKET_PORT, {
  namespace: '/delivery-tracking',
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingInterval: 25_000,
  pingTimeout: 20_000,
  connectTimeout: 45_000,
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class DeliveriesGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(DeliveriesGateway.name);

  constructor(
    @Inject(forwardRef(() => DeliveriesService))
    private readonly deliveriesService: DeliveriesService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(): void {
    const socketPort = this.configService.get<number>('DELIVERY_TRACKING_SOCKET_PORT') ?? 7005;
    this.logger.log(
      `Delivery tracking socket ready namespace=/delivery-tracking socketPort=${socketPort} url=http://localhost:${socketPort}/delivery-tracking`,
    );
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    this.logger.log(
      `Socket handshake received client=${client.id} namespace=${client.nsp.name} transport=${client.conn.transport.name}`,
    );

    if (this.isAuthDebugEnabled()) {
      this.logger.debug(
        `Socket handshake details client=${client.id} ${this.describeHandshake(client)}`,
      );
    }

    try {
      client.data.user = await this.authenticate(client);
      this.logger.log(
        `Socket connection accepted client=${client.id} userId=${client.data.user.id} role=${client.data.user.role}`,
      );
      client.emit('tracking:connected', { ok: true });
    } catch (error) {
      this.logger.warn(
        `Socket connection rejected client=${client.id} ${this.describeHandshake(client)} message=${this.getErrorMessage(error)}`,
      );
      client.emit('tracking:error', {
        message: this.getErrorMessage(error),
      });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('track:join')
  async joinTracking(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinTrackingPayload,
  ): Promise<WsResponse<unknown>> {
    try {
      const user = this.getSocketUser(client);
      const orderId = this.parseOrderId(payload.orderId);
      this.logger.log(`track:join client=${client.id} userId=${user.id} orderId=${orderId}`);
      const tracking = await this.deliveriesService.getTrackingByOrder(orderId, user);

      await client.join(this.orderRoom(orderId));

      return {
        event: 'tracking:snapshot',
        data: tracking,
      };
    } catch (error) {
      return this.toSocketError(error);
    }
  }

  @SubscribeMessage('delivery:location')
  async updateLocation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: UpdateMyDeliveryLocationDto,
  ): Promise<WsResponse<unknown>> {
    try {
      const user = this.getSocketUser(client);
      this.logger.log(
        `delivery:location client=${client.id} userId=${user.id} orderId=${payload.orderId}`,
      );

      if (user.role !== Role.DELIVERY_BOY) {
        throw new ForbiddenException('Only delivery boys can update live location');
      }

      const result = await this.deliveriesService.updateMyLiveLocation(user, payload);

      // Fetch current delivery + order state so we can build the unified payload.
      const deliveryWithOrder = await this.deliveriesService.getDeliveryWithOrderForSocket(
        payload.orderId,
      );

      const latestLocation = DeliveriesGateway.resolveLatestLocation(
        deliveryWithOrder?.status ?? DELIVERY_STATUS.ON_THE_WAY,
        result.tracking,
        deliveryWithOrder?.order?.restaurant,
      );

      const unifiedPayload = {
        type: 'DELIVERY_LOCATION_UPDATED',
        status: deliveryWithOrder?.order?.status ?? DELIVERY_STATUS.ON_THE_WAY,
        order: deliveryWithOrder
          ? this.deliveriesService.mapOrderForSocket(deliveryWithOrder)
          : null,
        latestLocation,
      };

      // Broadcast unified event to the room (customer + admin listening on this order).
      this.server.to(this.orderRoom(payload.orderId)).emit('order:updated', unifiedPayload);

      // Ack back to the delivery boy with the raw tracking result.
      return {
        event: 'delivery:location:updated',
        data: {
          orderId: payload.orderId,
          ...result,
        },
      };
    } catch (error) {
      return this.toSocketError(error);
    }
  }

  private async authenticate(client: Socket): Promise<AuthenticatedUser> {
    const token = extractSocketToken({
      auth: client.handshake.auth,
      headers: { authorization: client.handshake.headers.authorization },
      query: { token: client.handshake.query.token },
    });

    if (this.isAuthDebugEnabled()) {
      this.logger.debug(
        `Socket token extracted client=${client.id} token=${previewSocketToken(token)} length=${token?.length ?? 0} jwtFormatValid=${isJwtFormat(token)}`,
      );
    }

    if (!token) {
      throw new UnauthorizedException('Missing socket token');
    }

    return this.authService.verifySocketAccessToken(token);
  }

  private isAuthDebugEnabled(): boolean {
    return this.configService.get<string>('AUTH_DEBUG') === 'true';
  }

  private describeHandshake(client: Socket): string {
    const auth = this.stringifyForLog(client.handshake.auth);
    const authorizationHeader = this.stringifyForLog(client.handshake.headers.authorization);
    const queryToken = this.stringifyForLog(client.handshake.query.token);

    return `auth=${auth} authorizationHeader=${authorizationHeader} queryToken=${queryToken}`;
  }

  private stringifyForLog(value: unknown): string {
    if (value == null) {
      return 'null';
    }

    if (typeof value === 'string') {
      return JSON.stringify(value);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return '[unserializable]';
    }
  }

  private getSocketUser(client: AuthenticatedSocket): AuthenticatedUser {
    const user = client.data.user;

    if (!user) {
      this.logger.warn(`Unauthenticated socket event from ${client.id}`);
      throw new UnauthorizedException('Unauthorized');
    }

    return user;
  }

  private parseOrderId(orderId: number): number {
    const parsed = Number(orderId);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new ForbiddenException('Invalid order id');
    }

    return parsed;
  }

  private orderRoom(orderId: number): string {
    return `order:${orderId}`;
  }

  private toSocketError(error: unknown): WsResponse<{ message: string }> {
    return {
      event: 'tracking:error',
      data: {
        message: this.getErrorMessage(error),
      },
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Delivery tracking socket error';
  }

  emitOrderUpdated(orderId: number, payload: unknown): void {
    this.server.to(this.orderRoom(orderId)).emit('order:updated', payload);

    this.logger.log(`order:updated emitted orderId=${orderId}`);
  }

  emitOrdersRefresh(): void {
    this.server.emit('orders:refresh');
  }

  /**
   * Resolves the latestLocation for a socket payload.
   *
   * Priority:
   *  1. Most recent driver tracking log  → source: 'driver'
   *  2. Restaurant coordinates when status is ON_THE_WAY → source: 'restaurant'
   *  3. null for all other cases
   */
  static resolveLatestLocation(
    status: string,
    trackingLog:
      | {
          id: number;
          deliveryId: number;
          latitude: number;
          longitude: number;
          speed: number | null;
          heading: number | null;
          recordedAt: Date;
        }
      | null
      | undefined,
    restaurant: { latitude: number; longitude: number; id: number } | null | undefined,
  ): DeliveryTrackingLogDto | null {
    if (trackingLog) {
      return {
        id: trackingLog.id,
        deliveryId: trackingLog.deliveryId,
        latitude: trackingLog.latitude,
        longitude: trackingLog.longitude,
        speed: trackingLog.speed,
        heading: trackingLog.heading,
        recordedAt: trackingLog.recordedAt,
        source: 'driver',
      };
    }

    if (status === DELIVERY_STATUS.ON_THE_WAY && restaurant) {
      return {
        id: 0,
        deliveryId: 0,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        speed: null,
        heading: null,
        recordedAt: new Date(),
        source: 'restaurant',
      };
    }

    return null;
  }
}
