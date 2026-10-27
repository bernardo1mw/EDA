import { MetricsClient } from "./metrics-client";
import { OrderMetrics } from "@/types/metrics";

const PAYMENT_API_URL =
  process.env.NEXT_PUBLIC_PAYMENT_API_URL || "http://localhost:3001";

async function getMetrics(date: string): Promise<OrderMetrics | null> {
  try {
    const res = await fetch(`${PAYMENT_API_URL}/metrics/daily/${date}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<OrderMetrics>;
  } catch {
    return null;
  }
}

export default async function MetricsPage() {
  const today = new Date().toISOString().split("T")[0];
  const metrics = await getMetrics(today);
  return <MetricsClient initialMetrics={metrics} initialDate={today} />;
}
