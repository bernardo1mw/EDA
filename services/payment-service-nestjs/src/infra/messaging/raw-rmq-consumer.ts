import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { connect } from 'amqplib';
import { StructuredLogger } from '../../core/logging';
import { PaymentService } from '../../app/usecases/payment.service';
import { OrderCreatedEventDto } from '../controllers/dtos/order-created-event.dto';

@Injectable()
export class RawRmqConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new StructuredLogger('RawRmqConsumer');
  private connection: any = null;
  private channel: any = null;
  private readonly queueName = 'order.created';

  private paymentService!: PaymentService;

  constructor(
    private readonly configService: ConfigService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }

  private async start(): Promise<void> {
    try {
      this.paymentService = this.moduleRef.get(PaymentService, { strict: false });
      const rabbitmq = this.configService.get('app.rabbitmq');
      const url = `amqp://${rabbitmq.username}:${rabbitmq.password}@${rabbitmq.host}:${rabbitmq.port}${rabbitmq.vhost}`;

      this.connection = await connect(url);
      this.channel = await this.connection.createChannel();
      
      // Declare exchange (amq.topic is a built-in exchange, but we'll ensure it exists)
      const exchangeName = 'amq.topic';
      const routingKey = 'order.created';
      
      // Assert queue
      await this.channel.assertQueue(this.queueName, { durable: true });
      
      // Bind queue to exchange with routing key
      await this.channel.bindQueue(this.queueName, exchangeName, routingKey);
      
      await this.channel.prefetch(10);

      this.logger.log(`Raw RMQ consumer attached to queue '${this.queueName}' bound to exchange '${exchangeName}' with routing key '${routingKey}'`);

      this.channel.consume(this.queueName, async (msg) => {
        if (!msg) return;
        try {
          const data = JSON.parse(msg.content.toString());
          const dto: OrderCreatedEventDto = {
            orderId: data.order_id,
            customerId: data.customer_id,
            productId: data.product_id,
            quantity: data.quantity,
            totalAmount: data.total_amount,
            createdAt: data.created_at,
            traceId: data.trace_id,
            spanId: data.span_id,
          } as OrderCreatedEventDto;

          await this.paymentService.processOrderCreatedEvent(dto);
          this.channel!.ack(msg);
        } catch (err) {
          this.logger.error('Failed to process raw RMQ message', (err as Error).stack);
          this.channel!.nack(msg, false, false);
        }
      });
    } catch (error) {
      this.logger.error('Failed to start raw RMQ consumer', (error as Error).stack);
    }
  }

  private async stop(): Promise<void> {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch (error) {
      this.logger.error('Error stopping raw RMQ consumer', (error as Error).stack);
    }
  }
}


