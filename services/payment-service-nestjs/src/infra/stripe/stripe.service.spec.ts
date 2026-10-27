import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from './stripe.service';
import appConfig from '../../core/config';

const mockCreate = jest.fn();
const mockConfirm = jest.fn();
const mockRetrieve = jest.fn();

jest.mock('stripe', () => {
  const MockStripe = jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: mockCreate,
      confirm: mockConfirm,
      retrieve: mockRetrieve,
    },
  }));
  return { __esModule: true, default: MockStripe };
});

describe('StripeService', () => {
  let service: StripeService;

  const mockConfig = {
    stripe: {
      secretKey: 'sk_test_valid_test_key_abc123',
      apiVersion: '2023-10-16' as const,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: appConfig.KEY,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  describe('createPaymentIntent', () => {
    it('calls stripe with amount converted to cents and returns the intent', async () => {
      const fakeIntent = {
        id: 'pi_create_test',
        client_secret: 'cs_create_secret',
        status: 'requires_payment_method',
        amount: 9999,
        currency: 'usd',
      };
      mockCreate.mockResolvedValue(fakeIntent);

      const result = await service.createPaymentIntent(99.99, 'usd', { order_id: 'ord-001' });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 9999,
          currency: 'usd',
          metadata: { order_id: 'ord-001' },
        }),
      );
      expect(result.id).toBe('pi_create_test');
      expect(result.client_secret).toBe('cs_create_secret');
    });

    it('re-throws when Stripe API call fails', async () => {
      mockCreate.mockRejectedValue(new Error('Stripe network error'));

      await expect(service.createPaymentIntent(10.00, 'usd')).rejects.toThrow('Stripe network error');
    });
  });

  describe('confirmPaymentIntent', () => {
    it('calls stripe confirm with correct paymentIntentId and options', async () => {
      const confirmedIntent = {
        id: 'pi_confirm_test',
        status: 'succeeded',
      };
      mockConfirm.mockResolvedValue(confirmedIntent);

      const result = await service.confirmPaymentIntent('pi_confirm_test', {
        payment_method: 'pm_test_method',
      });

      expect(mockConfirm).toHaveBeenCalledWith('pi_confirm_test', {
        payment_method: 'pm_test_method',
      });
      expect(result.id).toBe('pi_confirm_test');
      expect(result.status).toBe('succeeded');
    });

    it('re-throws when Stripe confirm fails', async () => {
      mockConfirm.mockRejectedValue(new Error('Card declined'));

      await expect(
        service.confirmPaymentIntent('pi_fail', { payment_method: 'pm_bad' }),
      ).rejects.toThrow('Card declined');
    });
  });

  describe('mapStripeStatusToPaymentStatus', () => {
    it('maps succeeded to authorized', () => {
      expect(service.mapStripeStatusToPaymentStatus('succeeded')).toBe('authorized');
    });

    it('maps requires_capture to authorized', () => {
      expect(service.mapStripeStatusToPaymentStatus('requires_capture')).toBe('authorized');
    });

    it('maps processing to processing', () => {
      expect(service.mapStripeStatusToPaymentStatus('processing')).toBe('processing');
    });

    it('maps requires_payment_method to processing', () => {
      expect(service.mapStripeStatusToPaymentStatus('requires_payment_method')).toBe('processing');
    });

    it('maps requires_confirmation to processing', () => {
      expect(service.mapStripeStatusToPaymentStatus('requires_confirmation')).toBe('processing');
    });

    it('maps canceled to declined', () => {
      expect(service.mapStripeStatusToPaymentStatus('canceled')).toBe('declined');
    });
  });
});
