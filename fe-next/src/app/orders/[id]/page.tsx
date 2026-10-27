import type { Metadata } from "next";
import { OrderDetailClient } from "./order-detail-client";
import { Order } from "@/types/order";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getOrder(id: string): Promise<Order | null> {
  try {
    const res = await fetch(`${API_URL}/orders/${id}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<Order>;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order ${id}` };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  return <OrderDetailClient order={order} />;
}
