import React, { useState, FormEvent } from 'react';
import api from '../services/api';
import './Login.css';

interface LoginProps {
  onLogin: (role: string) => void;
  sessionExpired?: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.login(username, password);
      onLogin(response.role);
    } catch (err) {
      const errorMessage = (err as Error).message;
      
      // Provide user-friendly error messages
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError('Invalid username or password. Please try again.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setError('Unable to connect to server. Please check your connection and try again.');
      } else if (errorMessage.includes('timeout')) {
        setError('Request timed out. Please try again.');
      } else {
        setError(errorMessage || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="login-icon">🛒</div>
          <h1>Orders Management System</h1>
          <p className="subtitle">Please login to continue</p>
        </div>
{/* 
        {sessionExpired && (
          <div className="session-expired-banner">
            <span className="banner-icon">⏰</span>
            <span>Your session has expired. Please login again.</span>
          </div>
        )} */}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              disabled={loading}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="login-button">
            {loading ? (
              <>
                <span className="spinner"></span>
                <span>Logging in...</span>
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="demo-credentials">
          <p className="demo-title">
            <strong>Demo Credentials:</strong>
          </p>
          <div className="credentials-grid">
            <div className="credential-item">
              <span className="credential-label">Admin (Full Access):</span>
              <div className="credential-values">
                <code>admin</code> / <code>admin123</code>
              </div>
            </div>
            <div className="credential-item">
              <span className="credential-label">Viewer (Read Only):</span>
              <div className="credential-values">
                <code>viewer</code> / <code>viewer123</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;