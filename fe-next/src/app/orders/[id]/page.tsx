"use client";

import { useParams, useRouter } from "next/navigation";
import { OrderStatus } from "@/types/order";
import { useOrder } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const statusColors: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  [OrderStatus.PROCESSING]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  [OrderStatus.COMPLETED]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  [OrderStatus.FAILED]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  [OrderStatus.CANCELLED]: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

const statusLabels: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "Pendente",
  [OrderStatus.PROCESSING]: "Processando",
  [OrderStatus.COMPLETED]: "Completado",
  [OrderStatus.FAILED]: "Falhou",
  [OrderStatus.CANCELLED]: "Cancelado",
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const { data: order, isLoading, error } = useOrder(orderId);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 text-lg mb-4">
              {error instanceof Error ? error.message : "Pedido não encontrado"}
            </p>
            <Button onClick={() => router.push("/")} variant="secondary">
              Voltar para Lista
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          ← Voltar
        </Button>
        <Button variant="secondary" onClick={() => router.push("/")}>
          Novo Pedido
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">
                  Pedido #{order.id.slice(0, 8)}
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  ID completo: {order.id}
                </p>
              </div>
              <span
                className={cn("px-4 py-2 rounded-full text-sm font-medium", statusColors[order.status])}
              >
                {statusLabels[order.status]}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Cliente ID
                  </label>
                  <p className="mt-1 text-lg text-gray-900 dark:text-gray-100">
                    {order.customer_id}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Produto ID
                  </label>
                  <p className="mt-1 text-lg text-gray-900 dark:text-gray-100">
                    {order.product_id}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Quantidade
                  </label>
                  <p className="mt-1 text-lg text-gray-900 dark:text-gray-100">
                    {order.quantity}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total
                  </label>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(order.total_amount)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações Temporais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Criado em
                </label>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {formatDate(order.created_at)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatRelativeDate(order.created_at)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Atualizado em
                </label>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {formatDate(order.updated_at)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatRelativeDate(order.updated_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Este pedido foi processado usando o{" "}
                <span className="font-semibold">Transactional Outbox Pattern</span>
                .
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                O evento <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">order.created</code> foi
                salvo na tabela <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">outbox_events</code> e
                será processado assincronamente pelo serviço{" "}
                <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">outbox-dispatcher</code>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
