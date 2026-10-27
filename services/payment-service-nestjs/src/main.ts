import { setupTelemetry, shutdownTelemetry } from './core/telemetry';
setupTelemetry();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { StructuredLogger } from './core/logging';
import { AllExceptionsFilter } from './core/filters/http-exception.filter';

async function bootstrap() {
  const logger = new StructuredLogger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: new StructuredLogger(),
    });

    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));

    app.useGlobalFilters(new AllExceptionsFilter());

    const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4200'];
    app.enableCors({ origin: corsOrigins, credentials: true });

    const port = process.env.PORT || 3001;
    await app.listen(port);

    logger.log(`Payment Service started successfully on port ${port}`);
    logger.log(`Health check available at http://localhost:${port}/health`);
    logger.log(`Metrics available at http://localhost:${port}/metrics`);

  } catch (error) {
    logger.error('Failed to start Payment Service', (error as Error).stack);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await shutdownTelemetry();
  process.exit(0);
});

bootstrap();

