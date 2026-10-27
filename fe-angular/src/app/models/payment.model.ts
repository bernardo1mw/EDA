export interface PaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
}

export interface ConfirmPaymentResponse {
  status: string;
  payment_intent_id: string;
}
