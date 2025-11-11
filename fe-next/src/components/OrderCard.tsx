"use client";

import { useState, useCallback, memo } from "react";
import Link from "next/link";
import { Order, OrderStatus } from "@/types/order";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PaymentModal } from "@/components/modals/PaymentModal";
import { cn } from "@/lib/utils";

/**
 * Props do componente OrderCard
 */
interface OrderCardProps {
  /** Pedido a ser exibido */
  order: Order;
  /** Callback executado quando o pagamento é bem-sucedido */
  onPaymentSuccess?: () => void;
}

const statusColors: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  [OrderStatus.PROCESSING]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  [OrderStatus.COMPLETED]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  [OrderStatus.FAILED]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  [OrderStatus.CANCELLED]: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

/**
 * Componente OrderCard
 * 
 * Exibe um card com informações de um pedido.
 * Otimizado com React.memo para evitar re-renders desnecessários.
 * 
 * @example
 * ```tsx
 * <OrderCard 
 *   order={order} 
 *   onPaymentSuccess={() => refetchOrders()} 
 * />
 * ```
 */
export const OrderCard = memo(function OrderCard({ 
  order, 
  onPaymentSuccess 
}: OrderCardProps) {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handlePaymentClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (order.status !== OrderStatus.PENDING) {
      return;
    }

    setIsPaymentModalOpen(true);
  }, [order.status]);

  const handlePaymentSuccess = useCallback(() => {
    setIsPaymentModalOpen(false);
    onPaymentSuccess?.();
  }, [onPaymentSuccess]);

  const handleCloseModal = useCallback(() => {
    setIsPaymentModalOpen(false);
  }, []);

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 p-6 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-700/50 overflow-hidden">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-blue-50/0 to-blue-50/0 group-hover:from-blue-50/50 group-hover:via-transparent group-hover:to-transparent dark:group-hover:from-blue-950/20 transition-all duration-300 pointer-events-none" />
      
      <Link href={`/orders/${order.id}`} className="block relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30">
                <span className="text-lg">📦</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                  Pedido #{order.id.slice(0, 8)}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {order.customer_id}
                </p>
              </div>
            </div>
          </div>
          <span
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm whitespace-nowrap ml-2",
              statusColors[order.status]
            )}
          >
            {order.status}
          </span>
        </div>

        <div className="space-y-3 mt-4">
          <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <span className="text-sm text-gray-600 dark:text-gray-400">Produto</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate ml-2">
              {order.product_id}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <span className="text-sm text-gray-600 dark:text-gray-400">Quantidade</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {order.quantity}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 px-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800/50">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(order.total_amount)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 pt-2">
            <span>📅 Criado em</span>
            <span className="font-medium">
              {formatDate(order.created_at)}
            </span>
          </div>
        </div>
      </Link>

      {order.status === OrderStatus.PENDING && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 relative z-10">
          <Button
            onClick={handlePaymentClick}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40 transition-all duration-200 font-semibold"
          >
            💳 Pagar com Stripe
          </Button>
        </div>
      )}

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={handleCloseModal}
        onSuccess={handlePaymentSuccess}
        order={order}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparação customizada para otimização
  // Só re-renderiza se o pedido ou callback mudarem
  return (
    prevProps.order.id === nextProps.order.id &&
    prevProps.order.status === nextProps.order.status &&
    prevProps.order.total_amount === nextProps.order.total_amount &&
    prevProps.onPaymentSuccess === nextProps.onPaymentSuccess
  );
});
