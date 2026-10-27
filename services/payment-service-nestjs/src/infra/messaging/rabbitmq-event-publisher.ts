import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { PaymentEventData } from '../../domain/models/payment-event.dto';
import { IEventPublisher } from '../../domain/contracts/event-publisher.interface';
import { StructuredLogger } from '../../core/logging';

@Injectable()
export class RabbitMQEventPublisher implements IEventPublisher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new StructuredLogger('RabbitMQEventPublisher');
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      const rabbitmqConfig = this.configService.get('app.rabbitmq');
      
      const connectionString = `amqp://${rabbitmqConfig.username}:${rabbitmqConfig.password}@${rabbitmqConfig.host}:${rabbitmqConfig.port}${rabbitmqConfig.vhost}`;
      
      this.logger.log('Connecting to RabbitMQ...');
      this.connection = await amqp.connect(connectionString);
      this.channel = await this.connection.createChannel();

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed, reconnecting in 5s...');
        this.connection = null;
        this.channel = null;
        setTimeout(() => this.connect().catch(() => {}), 5000);
      });

      this.logger.log('Connected to RabbitMQ successfully');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', (error as Error).stack);
      throw error;
    }
  }

  private async disconnect() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ', (error as Error).stack);
    }
  }

  async publishPaymentEvent(event: PaymentEventData): Promise<void> {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not available');
      }

      this.logger.log(`Publishing payment event: ${event.paymentId}`);

      const exchange = 'amq.topic';
      const routingKey = `payment.${event.status}`;

      await this.channel.assertExchange(exchange, 'topic', { durable: true });

      const payload = {
        payment_id: event.paymentId,
        order_id: event.orderId,
        amount: event.amount,
        status: event.status,
        processed_at: event.processedAt,
        trace_id: event.traceId,
        span_id: event.spanId,
      };
      const message = JSON.stringify(payload);
      
      const published = this.channel.publish(
        exchange,
        routingKey,
        Buffer.from(message),
        {
          persistent: true,
          messageId: event.paymentId,
          timestamp: new Date(event.processedAt).getTime(),
          headers: {
            event_type: `payment.${event.status}`,
            order_id: event.orderId,
            payment_id: event.paymentId,
          },
        }
      );

      if (!published) {
        throw new Error('Failed to publish message to RabbitMQ');
      }

      this.logger.log(`Payment event published successfully - exchange: ${exchange}, routingKey: ${routingKey}, paymentId: ${event.paymentId}, orderId: ${event.orderId}, status: ${event.status}`);

    } catch (error) {
      this.logger.error(`Failed to publish payment event: ${event.paymentId}`, (error as Error).stack);
      throw error;
    }
  }
}