import { CustomersClient } from "./customers-client";
import { Customer } from "@/types/customer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getCustomers(): Promise<Customer[]> {
  try {
    const res = await fetch(`${API_URL}/customers/?limit=50&offset=0`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json() as Promise<Customer[]>;
  } catch {
    return [];
  }
}

export default async function CustomersPage() {
  const customers = await getCustomers();
  return <CustomersClient initialCustomers={customers} />;
}
