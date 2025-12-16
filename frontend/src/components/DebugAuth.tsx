import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const DebugAuth: React.FC = () => {
  const { user, isAuthenticated, token } = useAuth();

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '1px solid #ccc', 
      padding: '10px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4>Debug Auth Info</h4>
      <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
      <p><strong>Token:</strong> {token ? 'Present' : 'None'}</p>
      {user && (
        <div>
          <p><strong>User ID:</strong> {user.id}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Company ID:</strong> {user.companyId}</p>
        </div>
      )}
      <p><strong>Current URL:</strong> {window.location.pathname}</p>
    </div>
  );
};