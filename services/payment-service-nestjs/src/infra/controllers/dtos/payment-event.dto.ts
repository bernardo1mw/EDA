import { IsString, IsNumber, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class PaymentEventDto {
  @IsString()
  paymentId: string;

  @IsString()
  @IsUUID()
  orderId: string;

  @IsNumber()
  amount: number;

  @IsString()
  status: string;

  @IsDateString()
  processedAt: string;

  @IsOptional()
  @IsString()
  traceId?: string;

  @IsOptional()
  @IsString()
  spanId?: string;
}
