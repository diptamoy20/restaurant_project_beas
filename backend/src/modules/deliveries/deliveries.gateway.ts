import {
  ForbiddenException,
  Logger,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { Type } from 'class-transformer';
import { IsDefined, IsInt } from 'class-validator';
import { config as loadEnv } from 'dotenv';
import { Server, Socket } from 'socket.io';

import { DeliveriesService } from './deliveries.service';
import { UpdateMyDeliveryLocationDto } from './dto';
import { AuthenticatedUser, JwtPayload } from '../auth/auth.types';

loadEnv();

const socketPort = parseSocketPort(process.env.DELIVERY_TRACKING_SOCKET_PORT);

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

@WebSocketGateway(socketPort, {
  namespace: '/delivery-tracking',
  cors: {
    origin: true,
    credentials: true,
  },
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class DeliveriesGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(DeliveriesGateway.name);

  constructor(
    private readonly deliveriesService: DeliveriesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      client.data.user = await this.authenticate(client);
      client.emit('tracking:connected', { ok: true });
    } catch (error) {
      this.logger.warn(
        `Socket auth failed client=${client.id} ${this.describeHandshake(client)} message=${this.getErrorMessage(error)}`,
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

      // if (user.role !== Role.DELIVERY_BOY) {
      //   throw new ForbiddenException('Only delivery boys can update live location');
      // }

      const result = await this.deliveriesService.updateMyLiveLocation(user, payload);
      const data = {
        orderId: payload.orderId,
        ...result,
      };

      this.server.to(this.orderRoom(payload.orderId)).emit('delivery:location:updated', data);

      return {
        event: 'delivery:location:updated',
        data,
      };
    } catch (error) {
      return this.toSocketError(error);
    }
  }

  private async authenticate(client: Socket): Promise<AuthenticatedUser> {
    if (this.isAuthDebugEnabled()) {
      this.logger.debug(`Socket handshake client=${client.id} ${this.describeHandshake(client)}`);
    }

    const token = this.getToken(client);
    const tokenFormatValid = this.isValidJwtFormat(token);

    if (this.isAuthDebugEnabled()) {
      this.logger.debug(
        `Socket token extracted client=${client.id} token=${this.previewToken(token)} length=${token?.length ?? 0} jwtFormatValid=${tokenFormatValid}`,
      );
    }

    if (!token) {
      throw new UnauthorizedException('Missing socket token');
    }

    if (!tokenFormatValid) {
      throw new UnauthorizedException('Malformed socket token');
    }

    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.getOrThrow<string>('ACCESS_TOKEN_SECRET'),
    });

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const userId = payload.sub ?? payload.userId;

    if (!Number.isInteger(userId) || userId <= 0 || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: userId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      profileImageUrl: payload.profileImageUrl ?? null,
      role: payload.role,
      permissions: payload.permissions,
    };
  }

  private getToken(client: Socket): string | null {
    const authToken = this.extractTokenValue(client.handshake.auth);

    if (authToken) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;

    if (typeof header === 'string') {
      const normalized = this.normalizeToken(header);

      if (normalized) {
        return normalized;
      }
    }

    const queryToken = client.handshake.query.token;

    if (typeof queryToken === 'string' || Array.isArray(queryToken)) {
      const normalized = this.normalizeToken(queryToken);

      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  private extractTokenValue(value: unknown): string | null {
    if (value == null) {
      return null;
    }

    if (typeof value === 'string' || Array.isArray(value)) {
      return this.normalizeToken(value);
    }

    if (typeof value !== 'object') {
      return null;
    }

    const record = value as Record<string, unknown>;

    return (
      this.extractTokenValue(record.token) ??
      this.extractTokenValue(record.accessToken) ??
      this.extractTokenValue(record.access_token) ??
      this.extractTokenValue(record.Authorization) ??
      this.extractTokenValue(record.authorization)
    );
  }

  private normalizeToken(value: string | string[]): string | null {
    const raw = Array.isArray(value) ? value[0] : value;
    const trimmed = raw.trim().replace(/^['"]+|['"]+$/g, '');

    if (!trimmed) {
      return null;
    }

    const bearerStripped = trimmed.replace(/^Bearer\s+/i, '').trim();

    if (!bearerStripped) {
      return null;
    }

    if (
      (bearerStripped.startsWith('{') && bearerStripped.endsWith('}')) ||
      (bearerStripped.startsWith('[') && bearerStripped.endsWith(']'))
    ) {
      try {
        return this.extractTokenValue(JSON.parse(bearerStripped));
      } catch {
        return bearerStripped;
      }
    }

    return bearerStripped;
  }

  private isValidJwtFormat(token: string | null | undefined): boolean {
    const parts = token?.split('.');
    return parts?.length === 3;
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

  private previewToken(token: string | null | undefined): string {
    if (!token) {
      return 'null';
    }

    if (token.length <= 24) {
      return token;
    }

    return `${token.slice(0, 12)}...${token.slice(-12)}`;
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
}

function parseSocketPort(rawPort: string | undefined): number {
  const port = Number(rawPort ?? '4001');

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return 4001;
  }

  return port;
}
