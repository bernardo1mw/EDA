import Stripe from 'stripe';
import { PaymentStatus } from '../models/payment-status.enum';

export interface IPaymentGateway {
  createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.PaymentIntent>;

  confirmPaymentIntent(
    paymentIntentId: string,
    options?: Stripe.PaymentIntentConfirmParams,
  ): Promise<Stripe.PaymentIntent>;

  retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent>;

  cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent>;

  mapStripeStatusToPaymentStatus(stripeStatus: Stripe.PaymentIntent.Status): PaymentStatus;
}
