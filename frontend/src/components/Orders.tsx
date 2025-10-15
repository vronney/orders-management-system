import React, { useState, useEffect, ChangeEvent } from 'react';
import api from '../services/api';
import { Order, OrderStats, OrderFilters } from '../types';
import './Orders.css';

interface OrdersProps {
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

const Orders: React.FC<OrdersProps> = ({ onError }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const pageSize = 50;
  
  // Filter state
  const [filters, setFilters] = useState<OrderFilters>({
    customer_email: '',
    status: '',
    start_date: '',
    end_date: '',
  });

  // Load orders
  const loadOrders = async (): Promise<void> => {
    setLoading(true);
    setError('');

    try {
      const params: OrderFilters = {
        page: currentPage,
        page_size: pageSize,
        ...filters,
      };

      // Remove empty filters
      Object.keys(params).forEach((key) => {
        const k = key as keyof OrderFilters;
        if (!params[k]) delete params[k];
      });

      const response = await api.getOrders(params);
      setOrders(response.data);
      setTotalPages(response.total_pages);
      setTotalRecords(response.total);
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to load orders';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStats = async (): Promise<void> => {
    try {
      const statsData = await api.getOrderStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
      // Don't show error toast for stats failure as it's not critical
    }
  };

  // Load data on mount and when filters/page change
  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filters]);

  // Load stats once on mount
  useEffect(() => {
    loadStats();
  }, []);

  const handleFilterChange = (field: keyof OrderFilters, value: string): void => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleClearFilters = (): void => {
    setFilters({
      customer_email: '',
      status: '',
      start_date: '',
      end_date: '',
    });
    setCurrentPage(1);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="orders-container">
      <h2>Orders Management</h2>

      {/* Statistics */}
      {stats && (
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">Total Orders:</span>
            <span className="stat-value">{stats.total_orders.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Revenue:</span>
            <span className="stat-value">{formatCurrency(stats.total_revenue)}</span>
          </div>
          {stats.by_status && Object.entries(stats.by_status).map(([status, count]) => (
            <div key={status} className="stat-item">
              <span className="stat-label">{status}:</span>
              <span className="stat-value">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Customer Email</label>
            <input
              type="email"
              value={filters.customer_email || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => 
                handleFilterChange('customer_email', e.target.value)
              }
              placeholder="Filter by email"
            />
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status || ''}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => 
                handleFilterChange('status', e.target.value)
              }
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="datetime-local"
              value={filters.start_date || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => 
                handleFilterChange('start_date', e.target.value)
              }
            />
          </div>

          <div className="filter-group">
            <label>End Date</label>
            <input
              type="datetime-local"
              value={filters.end_date || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => 
                handleFilterChange('end_date', e.target.value)
              }
            />
          </div>
        </div>

        <button onClick={handleClearFilters} className="clear-filters-button">
          Clear Filters
        </button>
      </div>

      {/* Error Display */}
      {error && <div className="error-message">{error}</div>}

      {/* Loading State */}
      {loading && <div className="loading">Loading orders...</div>}

      {/* Orders Table */}
      {!loading && orders.length > 0 && (
        <>
          <div className="table-info">
            Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} orders
          </div>

          <div className="table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Order Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.order_id}</td>
                    <td>
                      <div className="customer-info">
                        <div>{order.customer_name}</div>
                        <div className="email">{order.customer_email}</div>
                      </div>
                    </td>
                    <td>{order.product_name}</td>
                    <td>{order.quantity}</td>
                    <td>{formatCurrency(order.total_amount)}</td>
                    <td>
                      <span className={`status-badge status-${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{formatDate(order.order_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              
              <span className="page-info">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </button>
            </div>
          )}
        </>
      )}

      {/* No Results */}
      {!loading && orders.length === 0 && (
        <div className="no-results">
          No orders found. Try adjusting your filters or upload some data.
        </div>
      )}
    </div>
  );
};

export default Orders;