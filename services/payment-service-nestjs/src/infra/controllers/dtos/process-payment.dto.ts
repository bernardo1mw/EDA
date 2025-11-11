import { IsString, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class ProcessPaymentDto {
  @IsString()
  @IsUUID()
  orderId: string;

  @IsNumber()
  amount: number;

  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  traceId?: string;

  @IsOptional()
  @IsString()
  spanId?: string;
}
