import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Redis } from '@upstash/redis';
import 'dotenv/config';
import 'reflect-metadata';
import { AppModule } from './app.module';
import { AppDataSource } from './database/data-source';

async function bootstrap() {
  try {
    console.log('[startup] Initializing database connection...');
    await AppDataSource.initialize().catch((error: unknown) => {
      console.warn('[startup] Database initialization warning:', error);
    });

    console.log('[startup] Connecting to Upstash Redis...');
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (redisUrl && redisToken) {
      const redisClient = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      await redisClient.set('startup:check', 'connected');
      const ping = await redisClient.get('startup:check');
      console.log('[startup] Upstash Redis connected:', ping);
    } else {
      console.warn(
        '[startup] Upstash Redis credentials are not configured; continuing without Redis.',
      );
    }

    const app = await NestFactory.create(AppModule);
    app.enableCors();

    const config = new DocumentBuilder()
      .setTitle('IT Asset Management API')
      .setDescription(
        'API documentation for the Intelligent IT Asset Management System',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = Number(process.env.PORT || 3001);
    await app.listen(port);

    console.log(`[startup] App is running on http://localhost:${port}`);
    console.log(
      `[startup] Swagger docs available at http://localhost:${port}/api/docs`,
    );
    console.log(
      '[startup] Database and Redis warnings above are non-blocking; persistence and caching features will be unavailable until those services are reachable.',
    );
  } catch (error) {
    console.error('[startup] Failed to start application', error);
    process.exit(1);
  }
}

bootstrap();
