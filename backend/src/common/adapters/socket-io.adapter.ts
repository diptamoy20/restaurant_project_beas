import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {
  constructor(private readonly app: INestApplication) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: true,
        credentials: true,
      },
      transports: ['polling', 'websocket'],
      allowEIO3: true,
      pingInterval: 25_000,
      pingTimeout: 20_000,
      connectTimeout: 45_000,
    });

    return server;
  }
}
