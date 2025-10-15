import React, { useState, ChangeEvent } from 'react';
import api from '../services/api';
import { UploadResponse } from '../types';
import './Upload.css';

interface UploadProps {
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

const Upload: React.FC<UploadProps> = ({ onError, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith('.csv')) {
        const errorMsg = 'Please select a CSV file';
        setError(errorMsg);
        onError?.(errorMsg);
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async (): Promise<void> => {
    if (!file) {
      const errorMsg = 'Please select a file first';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.uploadCSV(file);
      setResult(response);
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Show success toast
      if (response.records_failed === 0) {
        onSuccess?.(`Successfully uploaded ${response.records_created} orders!`);
      } else {
        onSuccess?.(`Uploaded ${response.records_created} orders with ${response.records_failed} errors`);
      }
    } catch (err) {
      const errorMsg = (err as Error).message || 'Upload failed';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <h2>Upload Orders CSV</h2>
      
      <div className="upload-card">
        <div className="file-input-wrapper">
          <label htmlFor="file-input" className="file-label">
            {file ? file.name : 'Choose CSV file...'}
          </label>
          <input
            id="file-input"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="upload-button"
        >
          {uploading ? 'Uploading...' : 'Upload CSV'}
        </button>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="result-message">
            <h3>Upload Results</h3>
            <div className="result-stats">
              <div className="stat">
                <span className="stat-label">Processed:</span>
                <span className="stat-value">{result.records_processed}</span>
              </div>
              <div className="stat success">
                <span className="stat-label">Created:</span>
                <span className="stat-value">{result.records_created}</span>
              </div>
              {result.records_failed > 0 && (
                <div className="stat error">
                  <span className="stat-label">Failed:</span>
                  <span className="stat-value">{result.records_failed}</span>
                </div>
              )}
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="error-details">
                <h4>Errors:</h4>
                <ul>
                  {result.errors.slice(0, 10).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {result.errors.length > 10 && (
                    <li>... and {result.errors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="csv-format-info">
        <h3>CSV Format</h3>
        <p>Your CSV file should have the following columns:</p>
        <code>
          order_id, customer_email, customer_name, product_name, quantity,
          unit_price, total_amount, status, order_date
        </code>
        <p className="format-note">
          <strong>Note:</strong> order_date should be in ISO format (YYYY-MM-DDTHH:MM:SS)
        </p>
        <p className="format-note">
          <strong>Status values:</strong> pending, processing, shipped, delivered, cancelled
        </p>
      </div>
    </div>
  );
};

export default Upload;