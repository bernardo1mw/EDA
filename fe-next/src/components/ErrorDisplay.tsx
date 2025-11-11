"use client";

import { memo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Props do componente ErrorDisplay
 */
interface ErrorDisplayProps {
  /** Título do erro */
  title?: string;
  /** Mensagem de erro */
  message: string;
  /** Ação de retry */
  onRetry?: () => void;
  /** Ícone ou elemento visual */
  icon?: ReactNode;
  /** Classes CSS adicionais */
  className?: string;
  /** Variante do erro */
  variant?: "default" | "compact";
}

/**
 * Componente ErrorDisplay
 * 
 * Componente reutilizável para exibir erros de forma consistente.
 * Otimizado com React.memo para evitar re-renders desnecessários.
 * 
 * @example
 * ```tsx
 * <ErrorDisplay
 *   message="Erro ao carregar pedidos"
 *   onRetry={() => refetch()}
 * />
 * ```
 */
export const ErrorDisplay = memo(function ErrorDisplay({
  title = "Algo deu errado",
  message,
  onRetry,
  icon,
  className,
  variant = "default",
}: ErrorDisplayProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4",
          className
        )}
        role="alert"
        aria-live="assertive"
      >
        <p className="text-red-800 dark:text-red-200 text-sm">{message}</p>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            Tentar Novamente
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("max-w-2xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
          {icon && <span aria-hidden="true">{icon}</span>}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="default">
            Tentar Novamente
          </Button>
        )}
      </CardContent>
    </Card>
  );
});

