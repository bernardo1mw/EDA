"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ProductCreateRequest } from "@/types/product";
import { useCreateProduct } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function NewProductPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();

  const [formData, setFormData] = useState<ProductCreateRequest>({
    name: "",
    description: "",
    price: 0,
    sku: "",
    stock_quantity: 0,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!formData.name.trim()) {
      return;
    }
    if (formData.price <= 0) {
      return;
    }

    try {
      await createProduct.mutateAsync(formData);
      router.push("/products");
    } catch (err) {
      console.error("Error creating product:", err);
    }
  };

  const error = createProduct.isError
    ? createProduct.error instanceof Error
      ? createProduct.error.message
      : "Erro ao criar produto. Tente novamente."
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Criar Novo Produto
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Preencha os dados abaixo para criar um novo produto
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">{error}</p>
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

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={createProduct.isPending}>
                {createProduct.isPending ? "Criando..." : "Criar Produto"}
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
