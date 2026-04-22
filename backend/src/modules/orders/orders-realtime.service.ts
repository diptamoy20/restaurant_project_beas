import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import { Server } from 'socket.io';

import { Role } from '../../common/enums/role.enum';
import { OrderResponseDto } from './dto/order-response.dto';

type AdminJoinPayload = {
  token?: string;
};

type TableJoinPayload = {
  tableId?: number | string;
};

@Injectable()
export class OrdersRealtimeService {
  private readonly logger = new Logger(OrdersRealtimeService.name);
  private io: Server | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  setServer(server: Server): void {
    this.io = server;
  }

  getTableRoom(tableId: number): string {
    return `table_${tableId}`;
  }

  async joinTableRoom(socket: Socket, payload: TableJoinPayload): Promise<void> {
    const tableId = this.normalizeTableId(payload?.tableId);

    await socket.join(this.getTableRoom(tableId));
    socket.emit('joinedTable', { tableId, room: this.getTableRoom(tableId) });
  }

  async joinAdminRoom(socket: Socket, payload: AdminJoinPayload): Promise<void> {
    const adminSocketToken = this.configService.get<string>('ADMIN_SOCKET_TOKEN')?.trim();
    const providedToken = typeof payload?.token === 'string' ? payload.token.trim() : '';

    if (adminSocketToken && providedToken && providedToken === adminSocketToken) {
      await socket.join('admin');
      socket.emit('joinedAdmin', { room: 'admin' });
      return;
    }

    const authToken =
      this.extractBearerToken(socket.handshake.auth?.token) ??
      this.extractBearerToken(socket.handshake.headers.authorization);

    if (!authToken) {
      throw new UnauthorizedException('Admin socket authorization is required');
    }

    const payloadData = await this.jwtService.verifyAsync<{
      roles?: string[];
    }>(authToken, {
      secret: this.configService.get<string>('ACCESS_TOKEN_SECRET'),
    });

    const roles = payloadData.roles ?? [];

    if (!roles.includes(Role.ADMIN) && !roles.includes(Role.MANAGER)) {
      throw new UnauthorizedException('Only admins and managers can join the admin room');
    }

    await socket.join('admin');
    socket.emit('joinedAdmin', { room: 'admin' });
  }

  emitNewOrder(order: OrderResponseDto): void {
    if (!this.io) {
      return;
    }

    this.io.to('admin').emit('newOrder', order);
    this.emitOrderUpdate(order);
  }

  emitOrderUpdate(order: OrderResponseDto): void {
    if (!this.io) {
      return;
    }

    this.io.to('admin').emit('orderUpdate', order);

    if (order.tableId) {
      this.io.to(this.getTableRoom(order.tableId)).emit('orderUpdate', order);
    }
  }

  notifySocketError(socket: Socket, event: string, error: unknown): void {
    const message = error instanceof Error ? error.message : 'Unexpected socket error';
    this.logger.warn(`${event} failed: ${message}`);
    socket.emit('socketError', { event, message });
  }

  private normalizeTableId(rawTableId: number | string | undefined): number {
    const tableId = Number(rawTableId);

    if (!Number.isInteger(tableId) || tableId <= 0) {
      throw new UnauthorizedException('A valid tableId is required');
    }

    return tableId;
  }

  private extractBearerToken(rawValue: unknown): string | null {
    if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
      return null;
    }

    return rawValue.startsWith('Bearer ') ? rawValue.slice(7) : rawValue;
  }
}
