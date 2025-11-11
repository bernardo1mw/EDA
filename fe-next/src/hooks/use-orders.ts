import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Order, OrderCreateRequest } from "@/types/order";

// Query keys
export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (filters: string) => [...orderKeys.lists(), { filters }] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  byCustomer: (customerId: string) => [...orderKeys.all, "customer", customerId] as const,
};

// Hook para listar todos os pedidos
export function useOrders(limit: number = 1000, offset: number = 0) {
  return useQuery({
    queryKey: [...orderKeys.lists(), limit, offset],
    queryFn: () => apiClient.listAllOrders(limit, offset),
  });
}

// Hook para listar pedidos por cliente
export function useOrdersByCustomer(customerId: string, limit: number = 100, offset: number = 0) {
  return useQuery({
    queryKey: [...orderKeys.byCustomer(customerId), limit, offset],
    queryFn: () => apiClient.getOrdersByCustomer(customerId, limit, offset),
    enabled: !!customerId,
  });
}

// Hook para buscar um pedido específico
export function useOrder(orderId: string) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => apiClient.getOrderById(orderId),
    enabled: !!orderId,
  });
}

// Hook para criar um pedido
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OrderCreateRequest) => apiClient.createOrder(data),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

