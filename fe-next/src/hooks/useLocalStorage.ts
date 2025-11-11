import { useState, useEffect, useCallback } from "react";

/**
 * Hook customizado para gerenciar estado sincronizado com localStorage
 * 
 * Fornece uma interface reativa para localStorage com suporte a:
 * - Sincronização automática entre componentes
 * - Serialização/deserialização automática
 * - Type safety com TypeScript
 * - Fallback para valores padrão
 * 
 * @template T - Tipo do valor armazenado
 * @param key - Chave do localStorage
 * @param initialValue - Valor inicial caso não exista no localStorage
 * @returns Tupla [valor, setter, remover]
 * 
 * @example
 * ```tsx
 * const [theme, setTheme, removeTheme] = useLocalStorage("theme", "light");
 * 
 * // Usar o valor
 * <div className={theme === "dark" ? "dark" : ""}>
 * 
 * // Atualizar o valor (atualiza localStorage automaticamente)
 * setTheme("dark");
 * 
 * // Remover do localStorage
 * removeTheme();
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // Estado para armazenar o valor
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Erro ao ler localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Função para atualizar o valor
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Permite que value seja uma função para ter a mesma API do useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        
        setStoredValue(valueToStore);
        
        // Salva no localStorage
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Erro ao salvar no localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Função para remover o valor
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Erro ao remover localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Escuta mudanças no localStorage de outras abas/janelas
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Erro ao sincronizar localStorage key "${key}":`, error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
}

