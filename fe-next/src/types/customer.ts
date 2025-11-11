export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at?: string;
}

export interface CustomerCreateRequest {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface CustomerUpdateRequest {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

