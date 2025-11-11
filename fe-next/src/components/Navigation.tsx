"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Pedidos", icon: "📦" },
    { href: "/orders/new", label: "Novo Pedido", icon: "➕" },
    { href: "/customers", label: "Clientes", icon: "👥" },
    { href: "/products", label: "Produtos", icon: "🛍️" },
    { href: "/metrics", label: "Métricas", icon: "📊" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50 transition-transform group-hover:scale-105">
                <span className="text-lg font-bold">OP</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                Order Process
              </span>
            </Link>
            
            <div className="hidden md:flex md:space-x-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                    )}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gradient-to-r from-blue-400 to-blue-600" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

