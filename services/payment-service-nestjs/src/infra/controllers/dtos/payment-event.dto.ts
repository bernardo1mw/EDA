import { IsString, IsNumber, IsDateString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { PaymentStatus } from '../../../domain/models/payment-status.enum';

export class PaymentEventDto {
  @IsString()
  paymentId: string;

  @IsString()
  @IsUUID()
  orderId: string;

  @IsNumber()
  amount: number;

  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsDateString()
  processedAt: string;

  @IsOptional()
  @IsString()
  traceId?: string;

  @IsOptional()
  @IsString()
  spanId?: string;
}
