import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Product, ProductCreateRequest, ProductUpdateRequest } from "@/types/product";

// Query keys
export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (filters: string) => [...productKeys.lists(), { filters }] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

// Hook para listar todos os produtos
export function useProducts(limit: number = 1000, offset: number = 0) {
  return useQuery({
    queryKey: [...productKeys.lists(), limit, offset],
    queryFn: () => apiClient.listProducts(limit, offset),
  });
}

// Hook para buscar um produto específico
export function useProduct(productId: string) {
  return useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: () => apiClient.getProductById(productId),
    enabled: !!productId,
  });
}

// Hook para criar um produto
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProductCreateRequest) => apiClient.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

// Hook para atualizar um produto
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductUpdateRequest }) =>
      apiClient.updateProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
    },
  });
}

