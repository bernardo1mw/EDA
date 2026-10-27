import { Injectable, Inject } from '@nestjs/common';
import Stripe from 'stripe';
import { OrderCreatedEventDto } from '../../infra/controllers/dtos/order-created-event.dto';
import { PaymentEventDto } from '../../infra/controllers/dtos/payment-event.dto';
import { ProcessPaymentDto } from '../../infra/controllers/dtos/process-payment.dto';
import { PaymentEventEntity } from '../../domain/models/payment-event.entity';
import { PaymentStatus } from '../../domain/models/payment-status.enum';
import { IPaymentRepository } from '../../domain/contracts/payment-repository.interface';
import { IEventPublisher } from '../../domain/contracts/event-publisher.interface';
import { IPaymentGateway } from '../../domain/contracts/payment-gateway.interface';
import { StructuredLogger } from '../../core/logging';

@Injectable()
export class ProcessPaymentUseCase {
  private readonly logger = new StructuredLogger('ProcessPaymentUseCase');

  constructor(
    @Inject('IPaymentRepository')
    private readonly paymentRepository: IPaymentRepository,
    @Inject('IEventPublisher')
    private readonly eventPublisher: IEventPublisher,
    @Inject('IPaymentGateway')
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(orderEvent: OrderCreatedEventDto): Promise<void> {
    this.logger.log(`Processing payment for order: ${orderEvent.orderId}`);

    try {
      const paymentIntent = await this.paymentGateway.createPaymentIntent(
        orderEvent.totalAmount,
        'usd',
        {
          order_id: orderEvent.orderId,
          customer_id: orderEvent.customerId || '',
          product_id: orderEvent.productId || '',
        },
      );

      const paymentStatus = this.paymentGateway.mapStripeStatusToPaymentStatus(paymentIntent.status);
      const paymentId = paymentIntent.id;

      const paymentEvent: PaymentEventDto = {
        paymentId,
        orderId: orderEvent.orderId,
        amount: orderEvent.totalAmount,
        status: paymentStatus,
        processedAt: new Date().toISOString(),
        traceId: orderEvent.traceId,
        spanId: orderEvent.spanId,
      };

      const paymentEntity = this.mapDtoToEntity(paymentEvent);
      await this.paymentRepository.save(paymentEntity);

      await this.eventPublisher.publishPaymentEvent(paymentEvent);

      this.logger.log(`Payment processed successfully - paymentId: ${paymentId}, orderId: ${orderEvent.orderId}, amount: ${orderEvent.totalAmount}, status: ${paymentStatus}`);
    } catch (error) {
      this.logger.error(`Failed to process payment for order: ${orderEvent.orderId}`, (error as Error).stack, 'ProcessPaymentUseCase');
      throw error;
    }
  }

  async processDirectPayment(paymentData: ProcessPaymentDto): Promise<{ clientSecret: string; paymentIntentId: string }> {
    this.logger.log(`Creating payment intent for order: ${paymentData.orderId}`);

    try {
      const paymentIntent = await this.paymentGateway.createPaymentIntent(
        paymentData.amount,
        'usd',
        { order_id: paymentData.orderId },
      );

      this.logger.log(`Payment intent created - paymentIntentId: ${paymentIntent.id}, orderId: ${paymentData.orderId}, amount: ${paymentData.amount}`);

      return {
        clientSecret: paymentIntent.client_secret || '',
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      this.logger.error(`Failed to create payment intent for order: ${paymentData.orderId}`, (error as Error).stack, 'ProcessPaymentUseCase');
      throw error;
    }
  }

  async confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string,
    orderId: string,
    returnUrl?: string,
  ): Promise<PaymentEventDto> {
    this.logger.log(`Confirming payment - paymentIntentId: ${paymentIntentId}, orderId: ${orderId}`);

    try {
      const confirmParams: Stripe.PaymentIntentConfirmParams = {
        payment_method: paymentMethodId,
      };

      if (returnUrl) {
        confirmParams.return_url = returnUrl;
      }

      const confirmedPaymentIntent = await this.paymentGateway.confirmPaymentIntent(
        paymentIntentId,
        confirmParams,
      );

      const paymentIntent = await this.paymentGateway.retrievePaymentIntent(paymentIntentId);
      const amount = paymentIntent.amount / 100;

      const paymentStatus = this.paymentGateway.mapStripeStatusToPaymentStatus(confirmedPaymentIntent.status);

      const paymentEvent: PaymentEventDto = {
        paymentId: confirmedPaymentIntent.id,
        orderId: orderId,
        amount: amount,
        status: paymentStatus,
        processedAt: new Date().toISOString(),
      };

      const paymentEntity = this.mapDtoToEntity(paymentEvent);
      await this.paymentRepository.save(paymentEntity);

      if (paymentStatus === PaymentStatus.AUTHORIZED) {
        await this.eventPublisher.publishPaymentEvent(paymentEvent);
      }

      this.logger.log(`Payment confirmed successfully - paymentId: ${confirmedPaymentIntent.id}, orderId: ${orderId}, amount: ${amount}, status: ${paymentStatus}`);

      return paymentEvent;
    } catch (error) {
      this.logger.error(`Failed to confirm payment - paymentIntentId: ${paymentIntentId}`, (error as Error).stack, 'ProcessPaymentUseCase');
      throw error;
    }
  }

  private mapDtoToEntity(dto: PaymentEventDto): PaymentEventEntity {
    const entity = new PaymentEventEntity();
    entity.paymentId = dto.paymentId;
    entity.orderId = dto.orderId;
    entity.amount = dto.amount;
    entity.status = dto.status;
    entity.traceId = dto.traceId;
    entity.spanId = dto.spanId;
    entity.processedAt = new Date(dto.processedAt);
    return entity;
  }
}
