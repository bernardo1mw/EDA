"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CustomerCreateRequest } from "@/types/customer";
import { useCreateCustomer } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function NewCustomerPage() {
  const router = useRouter();
  const createCustomer = useCreateCustomer();

  const [formData, setFormData] = useState<CustomerCreateRequest>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!formData.name.trim()) {
      return;
    }
    if (!formData.email.trim()) {
      return;
    }

    // Validação de email simples
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return;
    }

    try {
      await createCustomer.mutateAsync(formData);
      router.push("/customers");
    } catch (err) {
      console.error("Error creating customer:", err);
    }
  };

  const error = createCustomer.isError
    ? createCustomer.error instanceof Error
      ? createCustomer.error.message
      : "Erro ao criar cliente. Tente novamente."
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Criar Novo Cliente
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Preencha os dados abaixo para criar um novo cliente
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
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
                placeholder="João Silva"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="joao@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="text"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                type="text"
                value={formData.address || ""}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Rua, número, bairro, cidade"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={createCustomer.isPending}>
                {createCustomer.isPending ? "Criando..." : "Criar Cliente"}
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
