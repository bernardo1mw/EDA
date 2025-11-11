import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import Stripe from 'stripe';
import appConfig from '../../core/config';
import { StructuredLogger } from '../../core/logging';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new StructuredLogger('StripeService');

  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {
    const secretKey = this.config.stripe.secretKey;
    
    if (!secretKey || secretKey === 'sk_test_placeholder' || secretKey.trim() === '') {
      this.logger.error('Stripe secret key not configured or is placeholder. Please set STRIPE_SECRET_KEY environment variable with a valid Stripe test key.');
      throw new Error('Stripe secret key is required. Please configure STRIPE_SECRET_KEY environment variable.');
    }
    
    this.stripe = new Stripe(secretKey, {
      apiVersion: this.config.stripe.apiVersion,
    });
    
    this.logger.log('Stripe service initialized with API key');
  }

  /**
   * Create a payment intent with Stripe
   * @param amount Amount in dollars (will be converted to cents)
   * @param currency Currency code (default: 'usd')
   * @param metadata Additional metadata for the payment
   * @returns Stripe PaymentIntent
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    metadata?: Record<string, string>,
  ): Promise<Stripe.PaymentIntent> {
    try {
      // Convert amount to cents (Stripe uses smallest currency unit)
      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never' as const, // Não permitir métodos de pagamento que redirecionam
        },
        metadata: metadata || {},
      });

      this.logger.log(
        `Payment intent created: ${paymentIntent.id}, amount: ${amountInCents}, currency: ${currency}, status: ${paymentIntent.status}`
      );

      return paymentIntent;
    } catch (error) {
      this.logger.error(
        `Failed to create payment intent - amount: ${amount}, currency: ${currency}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw error;
    }
  }

  /**
   * Confirm a payment intent
   * @param paymentIntentId Payment intent ID
   * @param options Optional confirmation options
   * @returns Confirmed PaymentIntent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    options?: Stripe.PaymentIntentConfirmParams
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, options);

      this.logger.log(
        `Payment intent confirmed: ${paymentIntentId}, status: ${paymentIntent.status}`
      );

      return paymentIntent;
    } catch (error) {
      this.logger.error(
        `Failed to confirm payment intent: ${paymentIntentId}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw error;
    }
  }

  /**
   * Retrieve a payment intent
   * @param paymentIntentId Payment intent ID
   * @returns PaymentIntent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      this.logger.log(
        `Payment intent retrieved: ${paymentIntentId}, status: ${paymentIntent.status}`
      );

      return paymentIntent;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve payment intent: ${paymentIntentId}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw error;
    }
  }

  /**
   * Cancel a payment intent
   * @param paymentIntentId Payment intent ID
   * @returns Cancelled PaymentIntent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);

      this.logger.log(
        `Payment intent cancelled: ${paymentIntentId}, status: ${paymentIntent.status}`
      );

      return paymentIntent;
    } catch (error) {
      this.logger.error(
        `Failed to cancel payment intent: ${paymentIntentId}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw error;
    }
  }

  /**
   * Map Stripe payment intent status to our payment status
   * @param stripeStatus Stripe payment intent status
   * @returns Our payment status
   */
  mapStripeStatusToPaymentStatus(stripeStatus: Stripe.PaymentIntent.Status): string {
    switch (stripeStatus) {
      case 'succeeded':
        return 'authorized';
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
      case 'processing':
        return 'processing';
      case 'requires_capture':
        return 'authorized';
      case 'canceled':
        return 'declined';
      default:
        return 'failed';
    }
  }
}

