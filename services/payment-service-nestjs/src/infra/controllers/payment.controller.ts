import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PaymentService } from '../../app/usecases/payment.service';
import { ProcessPaymentUseCase } from '../../app/usecases/process-payment.use-case';
import { StructuredLogger } from '../../core/logging';
import { ProcessPaymentDto } from './dtos/process-payment.dto';
import { ConfirmPaymentDto } from './dtos/confirm-payment.dto';

@Controller('payments')
export class PaymentController {
  private readonly logger = new StructuredLogger('PaymentController');

  constructor(
    private readonly paymentService: PaymentService,
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
  ) {}

  @Get()
  async findAll() {
    this.logger.log('Getting all payments');
    return this.paymentService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.log(`Getting payment with id: ${id}`);
    return this.paymentService.findById(id);
  }

  @Post('process')
  async processPayment(@Body() paymentData: ProcessPaymentDto) {
    this.logger.log('Creating payment intent');
    return this.processPaymentUseCase.processDirectPayment(paymentData);
  }

  @Post('confirm')
  async confirmPayment(@Body() confirmData: ConfirmPaymentDto) {
    this.logger.log('Confirming payment');
    return this.processPaymentUseCase.confirmPayment(
      confirmData.paymentIntentId,
      confirmData.paymentMethodId,
      confirmData.orderId,
      confirmData.returnUrl,
    );
  }
}
