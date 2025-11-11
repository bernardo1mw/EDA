"use client";

import { useState, useEffect, FormEvent } from "react";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { Order } from "@/types/order";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder"
);

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: Order;
}

interface PaymentFormProps {
  order: Order;
  onSuccess: () => void;
  onClose: () => void;
  paymentIntentId: string;
}

function PaymentForm({ order, onSuccess, onClose, paymentIntentId }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !paymentIntentId) {
      return;
    }

    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Elemento de cartão não encontrado");
      setLoading(false);
      return;
    }

    try {
      // Criar payment method com os dados do cartão
      const { error: createError, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });

      if (createError) {
        setError(createError.message || "Erro ao criar payment method");
        setLoading(false);
        return;
      }

      if (!paymentMethod) {
        setError("Falha ao criar payment method");
        setLoading(false);
        return;
      }

      // Obter URL de retorno (página atual)
      const returnUrl = typeof window !== 'undefined' ? window.location.href : undefined;

      // Confirmar pagamento no backend
      await apiClient.confirmPayment(
        paymentIntentId,
        paymentMethod.id,
        order.id,
        returnUrl
      );

      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao processar pagamento";
      setError(errorMessage);
      console.error("Error processing payment:", err);
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: "16px",
        color: "#424770",
        "::placeholder": {
          color: "#aab7c4",
        },
      },
      invalid: {
        color: "#9e2146",
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Pedido:</strong> #{order.id.slice(0, 8)}
        </p>
        <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
          <strong>Total:</strong> R$ {order.total_amount.toFixed(2)}
        </p>
      </div>

      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Dados do Cartão
        </label>
        <CardElement options={cardElementOptions} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!stripe || loading}>
          {loading ? "Processando..." : "Pagar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function PaymentModal({ isOpen, onClose, onSuccess, order }: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  // Criar PaymentIntent quando o modal abrir
  useEffect(() => {
    if (isOpen && order) {
      const createIntent = async () => {
        try {
          const result = await apiClient.createPaymentIntent(
            order.id,
            order.total_amount,
            "card"
          );
          setClientSecret(result.clientSecret);
          setPaymentIntentId(result.paymentIntentId);
        } catch (err) {
          console.error("Error creating payment intent:", err);
        }
      };

      createIntent();
    } else {
      // Reset quando fechar
      setClientSecret(null);
      setPaymentIntentId(null);
    }
  }, [isOpen, order]);

  const options: StripeElementsOptions = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: "stripe",
        },
      }
    : {};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pagar com Stripe</DialogTitle>
        </DialogHeader>
        {clientSecret ? (
          <Elements stripe={stripePromise} options={options}>
            <PaymentForm
              order={order}
              onSuccess={onSuccess}
              onClose={onClose}
              paymentIntentId={paymentIntentId!}
            />
          </Elements>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
              Preparando pagamento...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
