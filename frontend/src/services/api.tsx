import {
  LoginResponse,
  Order,
  PaginatedResponse,
  OrderFilters,
  UploadResponse,
  OrderStats
} from '../types';

// Use Vite environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// Custom error class for better error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isAuthError: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
  private token: string | null;
  private role: string | null;
  private sessionExpiredCallback?: () => void;

  constructor() {
    this.token = localStorage.getItem('token');
    this.role = localStorage.getItem('role');
  }
  
  onSessionExpired(callback: () => void): void {
	this.sessionExpiredCallback = callback;
  }

  // Set authentication token
  setAuth(token: string, role: string): void {
    this.token = token;
    this.role = role;
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
  }

  // Clear authentication
  clearAuth(): void {
    this.token = null;
    this.role = null;
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  }

  // Get current role
  getRole(): string | null {
    return this.role || localStorage.getItem('role');
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.getRole() === 'admin';
  }

  // Generic fetch wrapper with error handling
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Normalize headers into a concrete string map to avoid TS union indexing issues
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };

    const incoming = options.headers as HeadersInit | undefined;
    if (incoming) {
      if (incoming instanceof Headers) {
        incoming.forEach((value, key) => { headers[key] = value; });
      } else if (Array.isArray(incoming)) {
        incoming.forEach(([key, value]) => { headers[key] = value; });
      } else {
        headers = { ...headers, ...incoming as Record<string, string> };
      }
    }
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized
      if (response.status === 401) {
        this.clearAuth();
        
        // Call session expired callback if set
        if (this.sessionExpiredCallback) {
          this.sessionExpiredCallback();
        } else {
          // Fallback to redirect
          window.location.href = '/';
        }
        
        throw new ApiError('Your session has expired. Please login again.', 401, true);
      }

      // Handle 403 Forbidden
      if (response.status === 403) {
        throw new ApiError('You do not have permission to perform this action.', 403);
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.detail || `Request failed with status ${response.status}`;
        throw new ApiError(message, response.status);
      }

      return await response.json();
    } catch (error) {
      // Network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError('Unable to connect to server. Please check your internet connection.');
      }
      
      // Re-throw ApiError
      if (error instanceof ApiError) {
        throw error;
      }

      // Unknown errors
      console.error('API request failed:', error);
      throw new ApiError('An unexpected error occurred. Please try again.');
    }
  }

  // Login
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await this.request<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      this.setAuth(response.access_token, response.role);
      return response;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        throw new ApiError('Invalid username or password', 401);
      }
      throw error;
    }
  }

  // Upload CSV file
  async uploadCSV(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload/orders`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.status === 401) {
        this.clearAuth();
        if (this.sessionExpiredCallback) {
          this.sessionExpiredCallback();
        }
        throw new ApiError('Your session has expired. Please login again.', 401, true);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(errorData.detail || 'Upload failed', response.status);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Upload failed. Please try again.');
    }
  }

  // Get orders with filtering and pagination
  async getOrders(params: OrderFilters = {}): Promise<PaginatedResponse<Order>> {
    const queryParams = new URLSearchParams();
    
    if (params.customer_email) queryParams.append('customer_email', params.customer_email);
    if (params.status) queryParams.append('status', params.status);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.page_size) queryParams.append('page_size', params.page_size.toString());

    const queryString = queryParams.toString();
    const endpoint = `/api/orders${queryString ? '?' + queryString : ''}`;

    return await this.request<PaginatedResponse<Order>>(endpoint);
  }

  // Get order statistics
  async getOrderStats(): Promise<OrderStats> {
    return await this.request<OrderStats>('/api/orders/stats');
  }

  // Get specific order
  async getOrder(orderId: string): Promise<Order> {
    return await this.request<Order>(`/api/orders/${orderId}`);
  }
}

export default new ApiService();