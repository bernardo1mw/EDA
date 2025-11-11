"use client";

import { useState } from "react";
import { useCustomers, customerKeys } from "@/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerModal } from "@/components/modals/CustomerModal";

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const { data: customers = [], isLoading, error } = useCustomers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<typeof customers[0] | null>(null);

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este cliente?")) {
      // TODO: Implementar delete na API quando disponível
      alert("Funcionalidade de exclusão ainda não implementada na API");
      // await apiClient.deleteCustomer(id);
      // queryClient.invalidateQueries({ queryKey: customerKeys.all });
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: customerKeys.all });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Header Section */}
      <div className="mb-8 md:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100 bg-clip-text text-transparent">
              Clientes
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Gerencie seus clientes
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingCustomer(null);
              setIsModalOpen(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 font-semibold px-6 py-6 text-base"
          >
            <span className="mr-2">➕</span>
            Novo Cliente
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
          <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">Carregando clientes...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                Erro ao carregar clientes
              </h3>
              <p className="text-red-700 dark:text-red-300 mb-4">
                {error instanceof Error ? error.message : "Ocorreu um erro inesperado"}
              </p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: customerKeys.all })}
                variant="outline"
                className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                Tentar Novamente
              </Button>
            </div>
          </div>
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 mb-6">
            <span className="text-4xl">👥</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Nenhum cliente cadastrado
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Comece criando seu primeiro cliente para gerenciar seus contatos de forma eficiente.
          </p>
          <Button
            onClick={() => {
              setEditingCustomer(null);
              setIsModalOpen(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 font-semibold px-8 py-6 text-base"
          >
            <span className="mr-2">➕</span>
            Criar Primeiro Cliente
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <Card 
              key={customer.id}
              className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-700/50 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30">
                    <span className="text-2xl">👤</span>
                  </div>
                  <CardTitle className="text-xl font-bold">{customer.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <span className="text-gray-500 dark:text-gray-400">📧</span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{customer.email}</span>
                  </div>
                  {customer.phone && (
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                      <span className="text-gray-500 dark:text-gray-400">📞</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{customer.phone}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-start gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                      <span className="text-gray-500 dark:text-gray-400 mt-0.5">📍</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium text-xs">{customer.address}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingCustomer(customer);
                      setIsModalOpen(true);
                    }}
                    className="flex-1 text-sm font-semibold"
                  >
                    ✏️ Editar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(customer.id)}
                    className="flex-1 text-sm font-semibold"
                  >
                    🗑️ Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCustomer(null);
        }}
        onSuccess={handleSuccess}
        customer={editingCustomer}
      />
    </div>
  );
}
