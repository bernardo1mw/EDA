import { IsString, IsNumber, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class OrderCreatedEventDto {
  @IsString()
  @IsUUID()
  orderId: string;

  @IsString()
  customerId: string;

  @IsString()
  productId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  totalAmount: number;

  @IsDateString()
  createdAt: string;

  @IsOptional()
  @IsString()
  traceId?: string;

  @IsOptional()
  @IsString()
  spanId?: string;
}

