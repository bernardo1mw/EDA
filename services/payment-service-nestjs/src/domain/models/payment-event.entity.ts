import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('payment_events')
export class PaymentEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_id', type: 'varchar', length: 255, unique: true })
  paymentId: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'status', type: 'varchar', length: 50 })
  status: string;

  @Column({ name: 'trace_id', type: 'varchar', length: 255, nullable: true })
  traceId?: string;

  @Column({ name: 'span_id', type: 'varchar', length: 255, nullable: true })
  spanId?: string;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt: Date;
}

