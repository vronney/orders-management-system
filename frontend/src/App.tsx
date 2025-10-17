import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './components/Login';
import Upload from './components/Upload';
import Orders from './components/Orders';
import OrderDetail from './components/OrderDetail';
import Toast from './components/Toast';
import api from './services/api';
import { useToast } from './hooks/useToast';
import './App.css';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);
  
  const { toasts, removeToast, showSuccess, showWarning } = useToast();

  // Check for existing auth on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      setIsAuthenticated(true);
      setUserRole(role);
    }

    // Set up session expired callback
    api.onSessionExpired(() => {
      setSessionExpired(true);
      setIsAuthenticated(false);
      setUserRole(null);
      showWarning('Your session has expired. Please login again.');
    });
  }, [showWarning]);

  const handleLogin = (role: string): void => {
    setIsAuthenticated(true);
    setUserRole(role);
    setSessionExpired(false);
    showSuccess(`Welcome back! Logged in as ${role}`);
  };

  const handleLogout = (): void => {
    api.clearAuth();
    setIsAuthenticated(false);
    setUserRole(null);
    showSuccess('Logged out successfully');
  };

  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} sessionExpired={sessionExpired} />
        <div className="toast-container">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      </>
    );
  }

  const isAdmin = userRole === 'admin';

  return (
    <div className="app">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-brand">
          <h1>🛒 Orders Management System</h1>
        </div>

        <div className="nav-links">
          <Link to="/" className="nav-link">
            📊 View Orders
          </Link>

          {isAdmin && (
            <Link to="/upload" className="nav-link">
              📤 Upload CSV
            </Link>
          )}
        </div>

        <div className="nav-user">
          <span className="user-role">
            <span className="role-badge">{userRole}</span>
          </span>
          <button onClick={handleLogout} className="logout-button">
            Logout →
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Orders />} />
          <Route path="/upload" element={isAdmin ? <Upload /> : <Navigate to="/" />} />
          <Route path="/:orderId" element={<OrderDetail />} />
        </Routes>
      </main>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default App;
