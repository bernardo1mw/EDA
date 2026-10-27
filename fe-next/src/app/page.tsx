import { HomeClient } from "./home-client";
import { Order } from "@/types/order";
import { Customer } from "@/types/customer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getOrders(): Promise<Order[]> {
  try {
    const res = await fetch(`${API_URL}/orders/?limit=20&offset=0`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return res.json() as Promise<Order[]>;
  } catch {
    return [];
  }
}

async function getCustomers(): Promise<Customer[]> {
  try {
    const res = await fetch(`${API_URL}/customers/?limit=20&offset=0`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json() as Promise<Customer[]>;
  } catch {
    return [];
  }
}

export default async function Home() {
  const [orders, customers] = await Promise.all([getOrders(), getCustomers()]);
  return <HomeClient initialOrders={orders} initialCustomers={customers} />;
}
