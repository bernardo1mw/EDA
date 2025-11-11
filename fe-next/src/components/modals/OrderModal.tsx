"use client";

import { useState, useEffect, FormEvent } from "react";
import { OrderCreateRequest } from "@/types/order";
import { useCustomers, useProducts, useCreateOrder } from "@/hooks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function OrderModal({ isOpen, onClose, onSuccess }: OrderModalProps) {
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

  // Reset form quando fechar
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        customer_id: "",
        product_id: "",
        quantity: 1,
        total_amount: 0,
      });
      setSelectedProductId("");
    }
  }, [isOpen]);

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
      await createOrder.mutateAsync(formData);
      onSuccess();
      onClose();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Pedido</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-2">
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

          <div className="space-y-2">
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

          {selectedProduct && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Preço unitário:</strong> R${" "}
                {selectedProduct.price.toFixed(2)}
              </p>
              {selectedProduct.stock_quantity !== undefined && (
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  <strong>Estoque disponível:</strong>{" "}
                  {selectedProduct.stock_quantity}
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
              value={formData.quantity}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  quantity: parseInt(e.target.value) || 1,
                })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="total">Total (R$)</Label>
            <Input
              id="total"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.total_amount.toFixed(2)}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  total_amount: parseFloat(e.target.value) || 0,
                })
              }
              readOnly
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createOrder.isPending}>
              {createOrder.isPending ? "Criando..." : "Criar Pedido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
