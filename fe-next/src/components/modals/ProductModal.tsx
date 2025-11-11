"use client";

import { useState, useEffect, FormEvent } from "react";
import { Product, ProductCreateRequest, ProductUpdateRequest } from "@/types/product";
import { useCreateProduct, useUpdateProduct } from "@/hooks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
}

export function ProductModal({
  isOpen,
  onClose,
  onSuccess,
  product,
}: ProductModalProps) {
  const isEditing = !!product;
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [formData, setFormData] = useState<ProductCreateRequest>({
    name: "",
    description: "",
    price: 0,
    sku: "",
    stock_quantity: 0,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price,
        sku: product.sku || "",
        stock_quantity: product.stock_quantity || 0,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        price: 0,
        sku: "",
        stock_quantity: 0,
      });
    }
  }, [product, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!formData.name.trim()) {
      return;
    }
    if (formData.price <= 0) {
      return;
    }
    if ((formData.stock_quantity ?? 0) < 0) {
      return;
    }

    try {
      if (isEditing && product) {
        const updateData: ProductUpdateRequest = {
          name: formData.name,
          description: formData.description || undefined,
          price: formData.price,
          sku: formData.sku || undefined,
          stock_quantity: formData.stock_quantity || 0,
        };
        await updateProduct.mutateAsync({ id: product.id, data: updateData });
      } else {
        await createProduct.mutateAsync(formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error(`Error ${isEditing ? "updating" : "creating"} product:`, err);
    }
  };

  const error = createProduct.isError || updateProduct.isError
    ? (() => {
        const err = createProduct.error || updateProduct.error;
        return err instanceof Error
          ? err.message
          : `Erro ao ${isEditing ? "atualizar" : "criar"} produto. Tente novamente.`;
      })()
    : null;

  const isLoading = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Produto" : "Criar Novo Produto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Produto Exemplo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              type="text"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Descrição do produto"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Preço (R$)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.price}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  price: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="99.99"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              type="text"
              value={formData.sku || ""}
              onChange={(e) =>
                setFormData({ ...formData, sku: e.target.value })
              }
              placeholder="SKU-001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock">Estoque</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              value={formData.stock_quantity || 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  stock_quantity: parseInt(e.target.value) || 0,
                })
              }
              placeholder="0"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : isEditing ? "Atualizar" : "Criar"} Produto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
