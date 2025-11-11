"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { OrderCreateRequest } from "@/types/order";
import { useCreateOrder, useCustomers, useProducts } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function NewOrderPage() {
  const router = useRouter();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const createOrder = useCreateOrder();

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [formData, setFormData] = useState<OrderCreateRequest>({
    customer_id: "",
    product_id: "",
    quantity: 1,
    total_amount: 0,
  });

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Atualizar total_amount quando product ou quantity mudarem
  useEffect(() => {
    if (formData.product_id && formData.quantity > 0 && selectedProduct) {
      setFormData((prev) => ({
        ...prev,
        total_amount: selectedProduct.price * prev.quantity,
      }));
    }
  }, [formData.product_id, formData.quantity, selectedProduct]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!formData.customer_id.trim()) {
      return;
    }
    if (!formData.product_id.trim()) {
      return;
    }
    if (formData.quantity <= 0) {
      return;
    }
    if (formData.total_amount <= 0) {
      return;
    }

    // Validação de estoque no frontend
    if (selectedProduct && selectedProduct.stock_quantity !== undefined) {
      if (selectedProduct.stock_quantity < formData.quantity) {
        return;
      }
    }

    try {
      const order = await createOrder.mutateAsync(formData);
      router.push(`/orders/${order.id}`);
    } catch (err) {
      console.error("Error creating order:", err);
    }
  };

  const error = createOrder.isError
    ? createOrder.error instanceof Error
      ? createOrder.error.message
      : "Erro ao criar pedido. Tente novamente."
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Criar Novo Pedido
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Preencha os dados abaixo para criar um novo pedido
        </p>
        {customers.length === 0 && (
          <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              Você precisa criar pelo menos um cliente antes de criar um pedido.{" "}
              <Link href="/customers" className="underline font-medium">
                Criar cliente
              </Link>
            </p>
          </div>
        )}
        {products.length === 0 && (
          <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              Você precisa criar pelo menos um produto antes de criar um pedido.{" "}
              <Link href="/products" className="underline font-medium">
                Criar produto
              </Link>
            </p>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="customer">Cliente</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, customer_id: value })
                  }
                  disabled={customersLoading}
                >
                  <SelectTrigger id="customer">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} ({customer.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Link href="/customers">
                <Button type="button" variant="secondary" className="mb-1">
                  Novo
                </Button>
              </Link>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="product">Produto</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => {
                    setFormData({ ...formData, product_id: value });
                    setSelectedProductId(value);
                  }}
                  disabled={productsLoading}
                >
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - R$ {product.price.toFixed(2)}
                        {product.stock_quantity !== undefined &&
                          ` (Estoque: ${product.stock_quantity})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Link href="/products">
                <Button type="button" variant="secondary" className="mb-1">
                  Novo
                </Button>
              </Link>
            </div>

            {selectedProduct && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Preço unitário:</strong> R${" "}
                  {selectedProduct.price.toFixed(2)}
                </p>
                {selectedProduct.stock_quantity !== undefined && (
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    <strong>Estoque disponível:</strong> {selectedProduct.stock_quantity}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max="1000"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity: parseInt(e.target.value) || 0,
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total">Total (R$)</Label>
              <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                {formData.total_amount > 0
                  ? new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(formData.total_amount)
                  : "0,00"}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {selectedProduct &&
                  `Calculado automaticamente: ${selectedProduct.price.toFixed(2)} × ${formData.quantity} = ${formData.total_amount.toFixed(2)}`}
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={createOrder.isPending}>
                {createOrder.isPending ? "Criando..." : "Criar Pedido"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
