import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from '../../app/usecases/payment.service';
import { ProcessPaymentUseCase } from '../../app/usecases/process-payment.use-case';
import { PaymentEventEntity } from '../../domain/models/payment-event.entity';
import { ProcessPaymentDto } from './dtos/process-payment.dto';
import { ConfirmPaymentDto } from './dtos/confirm-payment.dto';

describe('PaymentController', () => {
  let controller: PaymentController;

  const mockPaymentService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    processOrderCreatedEvent: jest.fn(),
  };

  const mockProcessPaymentUseCase = {
    processDirectPayment: jest.fn(),
    confirmPayment: jest.fn(),
    execute: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: ProcessPaymentUseCase, useValue: mockProcessPaymentUseCase },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  describe('findAll', () => {
    it('returns all payment entities from the service', async () => {
      const entity1 = new PaymentEventEntity();
      entity1.paymentId = 'pi_001';
      entity1.orderId = 'order-001';

      const entity2 = new PaymentEventEntity();
      entity2.paymentId = 'pi_002';
      entity2.orderId = 'order-002';

      mockPaymentService.findAll.mockResolvedValue([entity1, entity2]);

      const result = await controller.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].paymentId).toBe('pi_001');
      expect(mockPaymentService.findAll).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when no payments exist', async () => {
      mockPaymentService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('processPayment', () => {
    it('delegates to processDirectPayment and returns clientSecret', async () => {
      mockProcessPaymentUseCase.processDirectPayment.mockResolvedValue({
        clientSecret: 'cs_test_direct',
        paymentIntentId: 'pi_direct_001',
      });

      const dto: ProcessPaymentDto = {
        orderId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        amount: 149.99,
        paymentMethod: 'card',
      };

      const result = await controller.processPayment(dto);

      expect(result.clientSecret).toBe('cs_test_direct');
      expect(result.paymentIntentId).toBe('pi_direct_001');
      expect(mockProcessPaymentUseCase.processDirectPayment).toHaveBeenCalledWith(dto);
    });

    it('propagates errors from processDirectPayment', async () => {
      mockProcessPaymentUseCase.processDirectPayment.mockRejectedValue(new Error('Stripe unavailable'));

      const dto: ProcessPaymentDto = {
        orderId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        amount: 50.00,
        paymentMethod: 'card',
      };

      await expect(controller.processPayment(dto)).rejects.toThrow('Stripe unavailable');
    });
  });

  describe('confirmPayment', () => {
    it('delegates to confirmPayment use case with correct args', async () => {
      const paymentEvent = {
        paymentId: 'pi_confirm_001',
        orderId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        amount: 99.99,
        status: 'authorized',
        processedAt: new Date().toISOString(),
      };
      mockProcessPaymentUseCase.confirmPayment.mockResolvedValue(paymentEvent);

      const dto: ConfirmPaymentDto = {
        paymentIntentId: 'pi_confirm_001',
        paymentMethodId: 'pm_test_method',
        orderId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      };

      const result = await controller.confirmPayment(dto);

      expect(result.paymentId).toBe('pi_confirm_001');
      expect(result.status).toBe('authorized');
      expect(mockProcessPaymentUseCase.confirmPayment).toHaveBeenCalledWith(
        'pi_confirm_001',
        'pm_test_method',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        undefined,
      );
    });

    it('passes returnUrl when provided', async () => {
      mockProcessPaymentUseCase.confirmPayment.mockResolvedValue({
        paymentId: 'pi_redirect',
        orderId: 'order-redirect',
        amount: 30.00,
        status: 'processing',
        processedAt: new Date().toISOString(),
      });

      const dto: ConfirmPaymentDto = {
        paymentIntentId: 'pi_redirect',
        paymentMethodId: 'pm_redirect_method',
        orderId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        returnUrl: 'https://example.com/return',
      };

      await controller.confirmPayment(dto);

      expect(mockProcessPaymentUseCase.confirmPayment).toHaveBeenCalledWith(
        'pi_redirect',
        'pm_redirect_method',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'https://example.com/return',
      );
    });
  });
});
