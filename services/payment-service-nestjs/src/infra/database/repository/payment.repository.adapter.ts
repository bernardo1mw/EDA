import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEventEntity } from '../../../domain/models/payment-event.entity';
import { IPaymentRepository } from '../../../domain/contracts/payment-repository.interface';

@Injectable()
export class PaymentRepositoryAdapter implements IPaymentRepository {
  constructor(
    @InjectRepository(PaymentEventEntity)
    private paymentRepository: Repository<PaymentEventEntity>,
  ) {}

  async save(payment: PaymentEventEntity): Promise<PaymentEventEntity> {
    return this.paymentRepository.save(payment);
  }

  async findById(id: string): Promise<PaymentEventEntity | null> {
    return this.paymentRepository.findOne({ where: { paymentId: id } });
  }

  async findAll(): Promise<PaymentEventEntity[]> {
    return this.paymentRepository.find();
  }

  async findByOrderId(orderId: string): Promise<PaymentEventEntity[]> {
    return this.paymentRepository.find({ where: { orderId } });
  }
}
