export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  paymentMethodId: string;
  orderId: string;
  returnUrl?: string;
}

