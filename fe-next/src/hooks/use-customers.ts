import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Customer, CustomerCreateRequest, CustomerUpdateRequest } from "@/types/customer";

// Query keys
export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (filters: string) => [...customerKeys.lists(), { filters }] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

// Hook para listar todos os clientes
export function useCustomers(limit: number = 1000, offset: number = 0) {
  return useQuery({
    queryKey: [...customerKeys.lists(), limit, offset],
    queryFn: () => apiClient.listCustomers(limit, offset),
  });
}

// Hook para buscar um cliente específico
export function useCustomer(customerId: string) {
  return useQuery({
    queryKey: customerKeys.detail(customerId),
    queryFn: () => apiClient.getCustomerById(customerId),
    enabled: !!customerId,
  });
}

// Hook para criar um cliente
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CustomerCreateRequest) => apiClient.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

// Hook para atualizar um cliente
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CustomerUpdateRequest }) =>
      apiClient.updateCustomer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id) });
    },
  });
}

