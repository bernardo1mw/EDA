import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEventEntity } from '../models/payment-event.entity';
import { IPaymentRepository } from '../contracts/payment-repository.interface';
import { StructuredLogger } from '../../core/logging';

@Injectable()
export class PaymentRepository implements IPaymentRepository {
  private readonly logger = new StructuredLogger('PaymentRepository');

  constructor(
    @InjectRepository(PaymentEventEntity)
    private readonly repository: Repository<PaymentEventEntity>,
  ) {}

  async save(paymentEvent: PaymentEventEntity): Promise<PaymentEventEntity> {
    try {
      this.logger.log(`Saving payment event: ${paymentEvent.paymentId}`);
      return await this.repository.save(paymentEvent);
    } catch (error) {
      this.logger.error(`Failed to save payment event: ${paymentEvent.paymentId}`, error.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<PaymentEventEntity | null> {
    try {
      this.logger.log(`Finding payment event by ID: ${id}`);
      return await this.repository.findOne({ where: { paymentId: id } });
    } catch (error) {
      this.logger.error(`Failed to find payment event by ID: ${id}`, error.stack);
      throw error;
    }
  }

  async findAll(): Promise<PaymentEventEntity[]> {
    try {
      this.logger.log('Finding all payment events');
      return await this.repository.find();
    } catch (error) {
      this.logger.error('Failed to find all payment events', error.stack);
      throw error;
    }
  }

  async findByOrderId(orderId: string): Promise<PaymentEventEntity[]> {
    try {
      this.logger.log(`Finding payment events by order ID: ${orderId}`);
      return await this.repository.find({ where: { orderId } });
    } catch (error) {
      this.logger.error(`Failed to find payment events by order ID: ${orderId}`, error.stack);
      throw error;
    }
  }
}

