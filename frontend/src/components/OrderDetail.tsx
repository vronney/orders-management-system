import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Order } from '../types';
import './OrderDetail.css';

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadOrder = async (): Promise<void> => {
      if (!orderId) {
        setError('Order ID is required');
        setLoading(false);
        return;
      }

      try {
        const orderData = await api.getOrder(orderId);
        setOrder(orderData);
      } catch (err) {
        const errorMsg = (err as Error).message || 'Failed to load order';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="order-detail-container">
        <div className="loading">Loading order details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-detail-container">
        <div className="error-message">
          <h3>Error Loading Order</h3>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="back-button">
            ← Back to Orders
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-detail-container">
        <div className="error-message">
          <h3>Order Not Found</h3>
          <p>The requested order could not be found.</p>
          <button onClick={() => navigate('/')} className="back-button">
            ← Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-detail-container">
      <div className="order-detail-header">
        <button onClick={() => navigate('/')} className="back-button">
          ← Back to Orders
        </button>
        <h2>Order Details</h2>
      </div>

      <div className="order-detail-card">
        <h3>{order.order_id}</h3>

        <div className="order-detail-grid">
          <div className="order-detail-section">
            <h4>Customer Information</h4>
            <div className="detail-row">
              <span className="label">Name:</span>
              <span>{order.customer_name}</span>
            </div>
            <div className="detail-row">
              <span className="label">Email:</span>
              <span>{order.customer_email}</span>
            </div>
          </div>

          <div className="order-detail-section">
            <h4>Order Information</h4>
            <div className="detail-row">
              <span className="label">Product:</span>
              <span>{order.product_name}</span>
            </div>
            <div className="detail-row">
              <span className="label">Quantity:</span>
              <span>{order.quantity}</span>
            </div>
            <div className="detail-row">
              <span className="label">Order Date:</span>
              <span>{formatDate(order.order_date)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Status:</span>
              <span className={`status-badge status-${order.status}`}>
                {order.status}
              </span>
            </div>
          </div>

          <div className="order-detail-section">
            <h4>Pricing</h4>
            <div className="detail-row">
              <span className="label">Total Amount:</span>
              <span className="amount">{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
