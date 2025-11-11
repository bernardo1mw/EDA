import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { OrderMetrics } from "@/types/metrics";

// Query keys
export const metricsKeys = {
  all: ["metrics"] as const,
  daily: (date: string) => [...metricsKeys.all, "daily", date] as const,
};

/**
 * Hook para buscar métricas diárias
 * @param date - Data no formato YYYY-MM-DD
 */
export function useDailyMetrics(date: string) {
  return useQuery({
    queryKey: metricsKeys.daily(date),
    queryFn: () => apiClient.getDailyMetrics(date),
    enabled: !!date,
    staleTime: 60 * 1000, // 1 minuto
  });
}

