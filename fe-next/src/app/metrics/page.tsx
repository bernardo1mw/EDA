"use client";

import { useState } from "react";
import { useDailyMetrics, metricsKeys } from "@/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorDisplay } from "@/components/ErrorDisplay";

export default function MetricsPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => {
    // Data padrão: hoje
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const { data: metrics, isLoading, error, refetch } = useDailyMetrics(selectedDate);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: metricsKeys.daily(selectedDate) });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Header Section */}
      <div className="mb-8 md:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100 bg-clip-text text-transparent">
              Métricas
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Visualize métricas e KPIs dos pedidos
            </p>
          </div>
        </div>
      </div>

      {/* Date Selector */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Selecionar Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="w-full"
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 font-semibold"
            >
              🔄 Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-20">
          <LoadingSpinner size="lg" text="Carregando métricas..." />
        </div>
      ) : error ? (
        <ErrorDisplay
          message={
            error instanceof Error
              ? error.message
              : "Erro ao carregar métricas"
          }
          onRetry={handleRefresh}
        />
      ) : !metrics ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 mb-6">
            <span className="text-4xl">📊</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Nenhuma métrica encontrada
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Não há métricas disponíveis para a data selecionada. Tente selecionar outra data.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total de Pedidos */}
          <Card className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-700/50 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total de Pedidos
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30">
                  <span className="text-xl">📦</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {metrics.total_orders}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Pedidos processados
              </p>
            </CardContent>
          </Card>

          {/* Receita Total */}
          <Card className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 hover:shadow-xl hover:shadow-green-500/10 dark:hover:shadow-green-500/20 transition-all duration-300 hover:-translate-y-1 hover:border-green-300 dark:hover:border-green-700/50 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Receita Total
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30">
                  <span className="text-xl">💰</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(metrics.total_revenue)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Receita do dia
              </p>
            </CardContent>
          </Card>

          {/* Taxa de Sucesso */}
          <Card className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 hover:shadow-xl hover:shadow-purple-500/10 dark:hover:shadow-purple-500/20 transition-all duration-300 hover:-translate-y-1 hover:border-purple-300 dark:hover:border-purple-700/50 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Taxa de Sucesso
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30">
                  <span className="text-xl">✅</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {metrics.success_rate.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Pedidos bem-sucedidos
              </p>
            </CardContent>
          </Card>

          {/* Tempo Médio de Processamento */}
          <Card className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 hover:shadow-xl hover:shadow-orange-500/10 dark:hover:shadow-orange-500/20 transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 dark:hover:border-orange-700/50 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Tempo Médio
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30">
                  <span className="text-xl">⏱️</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {metrics.avg_processing_time_seconds > 0
                  ? `${metrics.avg_processing_time_seconds.toFixed(2)}s`
                  : "N/A"}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Tempo de processamento
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detalhes Adicionais */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Informações Adicionais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Data:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                  {new Date(metrics.date).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  Última atualização:
                </span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                  {new Date(metrics.updated_at).toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

