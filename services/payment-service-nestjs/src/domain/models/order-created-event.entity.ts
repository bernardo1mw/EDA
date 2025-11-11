import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('order_created_events')
export class OrderCreatedEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 255 })
  customerId: string;

  @Column({ name: 'product_id', type: 'varchar', length: 255 })
  productId: string;

  @Column({ name: 'quantity', type: 'integer' })
  quantity: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ name: 'trace_id', type: 'varchar', length: 255, nullable: true })
  traceId?: string;

  @Column({ name: 'span_id', type: 'varchar', length: 255, nullable: true })
  spanId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

