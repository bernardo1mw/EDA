import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { StructuredLogger } from './core/logging';
import * as amqp from 'amqplib';
import { PaymentService } from './app/usecases/payment.service';
import { OrderCreatedEventDto } from './infra/controllers/dtos/order-created-event.dto';

async function bootstrap() {
  const logger = new StructuredLogger('Bootstrap');

  try {
    // Create HTTP application
    const app = await NestFactory.create(AppModule, {
      logger: new StructuredLogger(),
    });

    // Enable validation pipes
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));

    // Enable CORS
    app.enableCors();

    // Nota: consumo RMQ será feito por consumidor raw abaixo para compatibilidade com mensagens não-Nest

    // Start HTTP server
    const port = process.env.PORT || 3001;
    await app.listen(port);

    logger.log(`Payment Service started successfully on port ${port}`);
    logger.log(`Health check available at http://localhost:${port}/health`);

    // Raw RMQ consumer foi modularizado em provider (RawRmqConsumer) e é iniciado via ciclo de vida do Nest

  } catch (error) {
    logger.error('Failed to start Payment Service', error.stack);
    process.exit(1);
  }
}

bootstrap();

