import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Server } from 'socket.io';

import { AppModule } from './app.module';
import { OrdersRealtimeService } from './modules/orders/orders-realtime.service';

function parseCsvEnv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app.use(helmet());

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const defaultOrigins =
    nodeEnv === 'production'
      ? []
      : [
          'http://localhost:4000',
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:4173',
        ];
  const configuredOrigins = parseCsvEnv(process.env.CORS_ORIGINS);
  const clientOrigins = parseCsvEnv(process.env.CLIENT_ORIGIN);
  const allowedOrigins =
    configuredOrigins.length > 0
      ? configuredOrigins
      : clientOrigins.length > 0
        ? clientOrigins
      : nodeEnv === 'production'
        ? []
        : defaultOrigins;

  if (nodeEnv === 'production' && allowedOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must be configured in production');
  }

  const allowedHeaders = parseCsvEnv(process.env.CORS_ALLOWED_HEADERS);
  const exposedHeaders = parseCsvEnv(process.env.CORS_EXPOSED_HEADERS);
  const corsMaxAgeSeconds = Number(process.env.CORS_MAX_AGE_SECONDS ?? '600');

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      logger.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: allowedHeaders.length > 0 ? allowedHeaders : ['Content-Type', 'Authorization'],
    exposedHeaders: exposedHeaders.length > 0 ? exposedHeaders : undefined,
    maxAge: Number.isFinite(corsMaxAgeSeconds) && corsMaxAgeSeconds > 0 ? corsMaxAgeSeconds : 600,
  });

  const httpServer = app.getHttpServer();
  const ordersRealtimeService = app.get(OrdersRealtimeService);
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        logger.warn(`Socket.IO CORS blocked for origin: ${origin}`);
        callback(new Error(`Socket.IO CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  ordersRealtimeService.setServer(io);
  io.on('connection', (socket) => {
    socket.on('joinTable', async (payload) => {
      try {
        await ordersRealtimeService.joinTableRoom(socket, payload);
      } catch (error) {
        ordersRealtimeService.notifySocketError(socket, 'joinTable', error);
      }
    });

    socket.on('joinAdmin', async (payload) => {
      try {
        await ordersRealtimeService.joinAdminRoom(socket, payload);
      } catch (error) {
        ordersRealtimeService.notifySocketError(socket, 'joinAdmin', error);
      }
    });
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  const docsEnabled = process.env.DOCS_ENABLED
    ? process.env.DOCS_ENABLED.toLowerCase() === 'true'
    : nodeEnv !== 'production';

  if (docsEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Restaurant Backend API')
      .setDescription('API contract for web and mobile clients')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste access token received from /api/auth/login',
        },
        'access-token',
      )
      .build();

    const openApiDocument = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('api/docs', app, openApiDocument, {
      jsonDocumentUrl: 'api/openapi.json',
      swaggerOptions: {
        persistAuthorization: true,
      },
      customSiteTitle: 'Restaurant API Docs',
    });
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
}

bootstrap();
