import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const nodeEnv = process.env.NODE_ENV ?? 'development';
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

  const port = process.env.PORT || 4001;
  await app.listen(port);
}

bootstrap();
