import { IsString, IsUUID, Matches, IsOptional } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  @Matches(/^pi_[a-zA-Z0-9]+$/, {
    message: 'paymentIntentId must be a valid Stripe PaymentIntent ID (starts with pi_)',
  })
  paymentIntentId: string;

  @IsString()
  @Matches(/^pm_[a-zA-Z0-9]+$/, {
    message: 'paymentMethodId must be a valid Stripe PaymentMethod ID (starts with pm_)',
  })
  paymentMethodId: string;

  @IsString()
  @IsUUID()
  orderId: string;

  @IsOptional()
  @IsString()
  @Matches(
    /^https?:\/\/.+/,
    {
      message: 'returnUrl must be a valid URL starting with http:// or https://',
    }
  )
  returnUrl?: string;
}

