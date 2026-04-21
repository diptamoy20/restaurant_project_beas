import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';

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
  const allowedOrigins =
    configuredOrigins.length > 0
      ? configuredOrigins
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
