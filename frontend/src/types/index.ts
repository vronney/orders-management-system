// Authentication types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
}

// Order types
export interface Order {
  id: number;
  order_id: string;
  customer_email: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  order_date: string;
  created_at: string;
  updated_at: string;
}

// Pagination types
export interface PaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  data: T[];
}

export interface OrderFilters {
  customer_email?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

// Upload types
export interface UploadResponse {
  message: string;
  records_processed: number;
  records_created: number;
  records_failed: number;
  errors?: string[];
}

// Statistics types
export interface OrderStats {
  total_orders: number;
  total_revenue: number;
  by_status: {
    [key: string]: number;
  };
}