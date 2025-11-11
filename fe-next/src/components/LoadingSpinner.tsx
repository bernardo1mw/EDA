"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

/**
 * Props do componente LoadingSpinner
 */
interface LoadingSpinnerProps {
  /** Tamanho do spinner */
  size?: "sm" | "md" | "lg";
  /** Classes CSS adicionais */
  className?: string;
  /** Texto a ser exibido abaixo do spinner */
  text?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

/**
 * Componente LoadingSpinner
 * 
 * Spinner de carregamento reutilizável e acessível.
 * Otimizado com React.memo para evitar re-renders desnecessários.
 * 
 * @example
 * ```tsx
 * <LoadingSpinner size="lg" text="Carregando pedidos..." />
 * ```
 */
export const LoadingSpinner = memo(function LoadingSpinner({
  size = "md",
  className,
  text,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-2", className)}
      role="status"
      aria-live="polite"
      aria-label={text || "Carregando"}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
          sizeClasses[size]
        )}
        aria-hidden="true"
      />
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
      )}
      <span className="sr-only">{text || "Carregando"}</span>
    </div>
  );
});

