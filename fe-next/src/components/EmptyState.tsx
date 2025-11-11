"use client";

import { memo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Props do componente EmptyState
 */
interface EmptyStateProps {
  /** Título do estado vazio */
  title: string;
  /** Descrição do estado vazio */
  description?: string;
  /** Ícone ou elemento visual */
  icon?: ReactNode;
  /** Ação primária */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Classes CSS adicionais */
  className?: string;
}

/**
 * Componente EmptyState
 * 
 * Componente reutilizável para exibir estados vazios.
 * Otimizado com React.memo para evitar re-renders desnecessários.
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   title="Nenhum pedido encontrado"
 *   description="Crie seu primeiro pedido para começar"
 *   action={{
 *     label: "Criar Pedido",
 *     onClick: () => router.push("/orders/new")
 *   }}
 * />
 * ```
 */
export const EmptyState = memo(function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {icon && (
        <div className="mb-4 text-gray-400 dark:text-gray-500" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="default">
          {action.label}
        </Button>
      )}
    </div>
  );
});

