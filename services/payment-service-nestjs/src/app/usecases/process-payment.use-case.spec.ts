import { Test, TestingModule } from '@nestjs/testing';
import { ProcessPaymentUseCase } from './process-payment.use-case';
import { IPaymentGateway } from '../../domain/contracts/payment-gateway.interface';
import { IPaymentRepository } from '../../domain/contracts/payment-repository.interface';
import { IEventPublisher } from '../../domain/contracts/event-publisher.interface';
import { PaymentEventEntity } from '../../domain/models/payment-event.entity';
import { PaymentStatus } from '../../domain/models/payment-status.enum';
import { ProcessPaymentDto } from '../../infra/controllers/dtos/process-payment.dto';
import { OrderCreatedEventDto } from '../../infra/controllers/dtos/order-created-event.dto';

describe('ProcessPaymentUseCase', () => {
  let useCase: ProcessPaymentUseCase;

  const mockPaymentRepository: jest.Mocked<IPaymentRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findByOrderId: jest.fn(),
  };

  const mockEventPublisher: jest.Mocked<IEventPublisher> = {
    publishPaymentEvent: jest.fn(),
  };

  const mockPaymentGateway: jest.Mocked<Pick<IPaymentGateway, 'createPaymentIntent' | 'confirmPaymentIntent' | 'retrievePaymentIntent' | 'mapStripeStatusToPaymentStatus'>> = {
    createPaymentIntent: jest.fn(),
    confirmPaymentIntent: jest.fn(),
    retrievePaymentIntent: jest.fn(),
    mapStripeStatusToPaymentStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessPaymentUseCase,
        { provide: 'IPaymentRepository', useValue: mockPaymentRepository },
        { provide: 'IEventPublisher', useValue: mockEventPublisher },
        { provide: 'IPaymentGateway', useValue: mockPaymentGateway },
      ],
    }).compile();

    useCase = module.get<ProcessPaymentUseCase>(ProcessPaymentUseCase);
  });

  describe('processDirectPayment', () => {
    it('creates a Stripe payment intent and returns clientSecret and paymentIntentId', async () => {
      mockPaymentGateway.createPaymentIntent.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'cs_test_secret',
        status: 'requires_payment_method',
      } as any);

      const dto: ProcessPaymentDto = {
        orderId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        amount: 99.99,
        paymentMethod: 'card',
      };

      const result = await useCase.processDirectPayment(dto);

      expect(result.clientSecret).toBe('cs_test_secret');
      expect(result.paymentIntentId).toBe('pi_test_123');
      expect(mockPaymentGateway.createPaymentIntent).toHaveBeenCalledWith(
        99.99,
        'usd',
        { order_id: dto.orderId },
      );
    });

    it('re-throws when Stripe createPaymentIntent fails', async () => {
      const stripeError = new Error('Stripe API error');
      mockPaymentGateway.createPaymentIntent.mockRejectedValue(stripeError);

      const dto: ProcessPaymentDto = {
        orderId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        amount: 50.00,
        paymentMethod: 'card',
      };

      await expect(useCase.processDirectPayment(dto)).rejects.toThrow('Stripe API error');
      expect(mockPaymentRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('confirmPayment', () => {
    it('confirms intent, saves to DB, and publishes event when status is authorized', async () => {
      mockPaymentGateway.confirmPaymentIntent.mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
      } as any);
      mockPaymentGateway.retrievePaymentIntent.mockResolvedValue({
        id: 'pi_test_123',
        amount: 9999,
        status: 'succeeded',
      } as any);
      mockPaymentGateway.mapStripeStatusToPaymentStatus.mockReturnValue(PaymentStatus.AUTHORIZED);

      const savedEntity = new PaymentEventEntity();
      savedEntity.paymentId = 'pi_test_123';
      mockPaymentRepository.save.mockResolvedValue(savedEntity);
      mockEventPublisher.publishPaymentEvent.mockResolvedValue(undefined);

      const result = await useCase.confirmPayment(
        'pi_test_123',
        'pm_test_method',
        'order-uuid-001',
      );

      expect(result.paymentId).toBe('pi_test_123');
      expect(result.status).toBe(PaymentStatus.AUTHORIZED);
      expect(mockPaymentRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publishPaymentEvent).toHaveBeenCalledTimes(1);
    });

    it('saves to DB but does not publish event when status is not authorized', async () => {
      mockPaymentGateway.confirmPaymentIntent.mockResolvedValue({
        id: 'pi_test_456',
        status: 'requires_action',
      } as any);
      mockPaymentGateway.retrievePaymentIntent.mockResolvedValue({
        id: 'pi_test_456',
        amount: 5000,
        status: 'requires_action',
      } as any);
      mockPaymentGateway.mapStripeStatusToPaymentStatus.mockReturnValue(PaymentStatus.PROCESSING);

      const savedEntity = new PaymentEventEntity();
      savedEntity.paymentId = 'pi_test_456';
      mockPaymentRepository.save.mockResolvedValue(savedEntity);

      const result = await useCase.confirmPayment(
        'pi_test_456',
        'pm_test_method',
        'order-uuid-002',
      );

      expect(result.status).toBe(PaymentStatus.PROCESSING);
      expect(mockPaymentRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publishPaymentEvent).not.toHaveBeenCalled();
    });

    it('re-throws when DB save fails', async () => {
      mockPaymentGateway.confirmPaymentIntent.mockResolvedValue({
        id: 'pi_test_789',
        status: 'succeeded',
      } as any);
      mockPaymentGateway.retrievePaymentIntent.mockResolvedValue({
        id: 'pi_test_789',
        amount: 2000,
        status: 'succeeded',
      } as any);
      mockPaymentGateway.mapStripeStatusToPaymentStatus.mockReturnValue(PaymentStatus.AUTHORIZED);
      mockPaymentRepository.save.mockRejectedValue(new Error('DB write failure'));

      await expect(
        useCase.confirmPayment('pi_test_789', 'pm_test_method', 'order-uuid-003'),
      ).rejects.toThrow('DB write failure');
    });
  });

  describe('execute (event-driven flow)', () => {
    it('processes payment from order event and publishes payment event', async () => {
      mockPaymentGateway.createPaymentIntent.mockResolvedValue({
        id: 'pi_event_001',
        client_secret: 'cs_event_secret',
        status: 'succeeded',
      } as any);
      mockPaymentGateway.mapStripeStatusToPaymentStatus.mockReturnValue(PaymentStatus.AUTHORIZED);

      const savedEntity = new PaymentEventEntity();
      savedEntity.paymentId = 'pi_event_001';
      mockPaymentRepository.save.mockResolvedValue(savedEntity);
      mockEventPublisher.publishPaymentEvent.mockResolvedValue(undefined);

      const orderEvent: OrderCreatedEventDto = {
        orderId: 'order-uuid-event',
        customerId: 'customer-001',
        productId: 'product-001',
        quantity: 2,
        totalAmount: 49.99,
        createdAt: new Date().toISOString(),
      };

      await useCase.execute(orderEvent);

      expect(mockPaymentGateway.createPaymentIntent).toHaveBeenCalledWith(
        49.99,
        'usd',
        expect.objectContaining({ order_id: 'order-uuid-event' }),
      );
      expect(mockPaymentRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publishPaymentEvent).toHaveBeenCalledTimes(1);
    });
  });
});
