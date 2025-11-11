"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * 
 * Captura erros JavaScript em qualquer lugar da árvore de componentes filhos,
 * registra esses erros e exibe uma UI de fallback em vez da árvore de componentes que quebrou.
 * 
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 * 
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Atualiza o state para que a próxima renderização mostre a UI de fallback
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Você pode registrar o erro em um serviço de relatório de erros aqui
    console.error("ErrorBoundary capturou um erro:", error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Callback opcional para logging externo
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Renderiza a UI de fallback customizada ou a padrão
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">
                Algo deu errado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Ocorreu um erro inesperado. Por favor, tente novamente.
              </p>
              
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Detalhes do erro (modo desenvolvimento)
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-auto text-xs">
                    <code className="text-red-600 dark:text-red-400">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </code>
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="default">
                  Tentar Novamente
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Recarregar Página
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

