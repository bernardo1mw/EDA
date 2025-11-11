export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  sku?: string;
  stock_quantity?: number;
  created_at: string;
  updated_at?: string;
}

export interface ProductCreateRequest {
  name: string;
  description?: string;
  price: number;
  sku?: string;
  stock_quantity?: number;
}

export interface ProductUpdateRequest {
  name: string;
  description?: string;
  price: number;
  sku?: string;
  stock_quantity: number;
}

