"use client";

import { useMemo, useState } from "react";
import { useOrders, useCustomers, orderKeys } from "@/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { OrderCard } from "@/components/OrderCard";
import { Button } from "@/components/ui/button";
import { OrderModal } from "@/components/modals/OrderModal";

export default function Home() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useOrders();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const isLoading = ordersLoading || customersLoading;
  const error = ordersError;

  // Agrupar pedidos por cliente
  const ordersByCustomer = useMemo(() => {
    const grouped: Record<string, { customer: typeof customers[0] | null; orders: typeof orders }> = {};
    
    orders.forEach((order) => {
      const customerId = order.customer_id;
      if (!grouped[customerId]) {
        const customer = customers.find((c) => c.id === customerId);
        grouped[customerId] = {
          customer: customer || null,
          orders: [],
        };
      }
      grouped[customerId].orders.push(order);
    });
    
    return grouped;
  }, [orders, customers]);

  const handlePaymentSuccess = async () => {
    // Aguardar um pouco para o backend processar o pagamento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Invalidar e refetch queries
    await queryClient.invalidateQueries({ queryKey: orderKeys.all });
    
    // Se o status ainda não foi atualizado, tentar novamente após mais alguns segundos
    setTimeout(async () => {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
    }, 3000);
  };

  const handleOrderCreated = () => {
    // Invalidar queries para recarregar dados
    queryClient.invalidateQueries({ queryKey: orderKeys.all });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Header Section */}
      <div className="mb-8 md:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100 bg-clip-text text-transparent">
              Pedidos
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Todos os pedidos agrupados por cliente
            </p>
          </div>
          <Button 
            onClick={() => setIsOrderModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 font-semibold px-6 py-6 text-base"
          >
            <span className="mr-2">➕</span>
            Novo Pedido
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
          </div>
          <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">Carregando pedidos...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                Erro ao carregar dados
              </h3>
              <p className="text-red-700 dark:text-red-300 mb-4">
                {error instanceof Error ? error.message : "Ocorreu um erro inesperado"}
              </p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: orderKeys.all })}
                variant="outline"
                className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                Tentar Novamente
              </Button>
            </div>
          </div>
        </div>
      ) : Object.keys(ordersByCustomer).length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 mb-6">
            <span className="text-4xl">📦</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Nenhum pedido encontrado
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Comece criando seu primeiro pedido para gerenciar suas vendas de forma eficiente.
          </p>
          <Button 
            onClick={() => setIsOrderModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 font-semibold px-8 py-6 text-base"
          >
            <span className="mr-2">➕</span>
            Criar Primeiro Pedido
          </Button>
        </div>
      ) : (
        <div className="space-y-8 md:space-y-10">
          {Object.entries(ordersByCustomer).map(([customerId, { customer, orders: customerOrders }]) => (
            <div 
              key={customerId} 
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700/50 p-6 md:p-8 hover:shadow-xl transition-shadow duration-300 overflow-hidden relative"
            >
              {/* Decorative gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
              
              <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30">
                      <span className="text-2xl">👤</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {customer ? (
                          <>
                            {customer.name}
                            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2 block sm:inline">
                              {customer.email}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">
                            Cliente ID: {customerId.substring(0, 8)}...
                          </span>
                        )}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {customerOrders.length} {customerOrders.length === 1 ? "pedido" : "pedidos"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {formatCurrency(customerOrders.reduce((sum, o) => sum + o.total_amount, 0))}
                    </span>
                    <span className="text-xs text-blue-600 dark:text-blue-400">total</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {customerOrders.map((order) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onPaymentSuccess={handlePaymentSuccess}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSuccess={handleOrderCreated}
      />
    </div>
  );
}
