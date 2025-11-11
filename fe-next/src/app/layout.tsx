import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Providers } from "@/lib/providers";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Order Process - Sistema de Pedidos",
  description: "Sistema de gerenciamento de pedidos com arquitetura orientada a eventos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 min-h-screen`}
      >
        <ErrorBoundary>
          <Navigation />
          <Providers>
            <main className="min-h-screen">{children}</main>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
