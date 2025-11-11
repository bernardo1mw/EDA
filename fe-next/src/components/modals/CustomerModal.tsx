"use client";

import { useState, useEffect, FormEvent } from "react";
import { Customer, CustomerCreateRequest, CustomerUpdateRequest } from "@/types/customer";
import { useCreateCustomer, useUpdateCustomer } from "@/hooks";
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

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer?: Customer | null;
}

export function CustomerModal({
  isOpen,
  onClose,
  onSuccess,
  customer,
}: CustomerModalProps) {
  const isEditing = !!customer;
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const [formData, setFormData] = useState<CustomerCreateRequest>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone || "",
        address: customer.address || "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
      });
    }
  }, [customer, isOpen]);

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
      if (isEditing && customer) {
        const updateData: CustomerUpdateRequest = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
        };
        await updateCustomer.mutateAsync({ id: customer.id, data: updateData });
      } else {
        await createCustomer.mutateAsync(formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error(`Error ${isEditing ? "updating" : "creating"} customer:`, err);
    }
  };

  const error = createCustomer.isError || updateCustomer.isError
    ? (() => {
        const err = createCustomer.error || updateCustomer.error;
        return err instanceof Error
          ? err.message
          : `Erro ao ${isEditing ? "atualizar" : "criar"} cliente. Tente novamente.`;
      })()
    : null;

  const isLoading = createCustomer.isPending || updateCustomer.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Cliente" : "Criar Novo Cliente"}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : isEditing ? "Atualizar" : "Criar"} Cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
