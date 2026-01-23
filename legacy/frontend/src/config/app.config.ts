/**
 * Application Configuration
 * Centralized configuration for the Vider Transport Marketplace
 */

export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
  };
  ui: {
    refreshInterval: number;
    notificationTimeout: number;
    autoRefresh: boolean;
  };
  deployment: {
    environment: 'development' | 'staging' | 'production';
    frontendUrl: string;
    backendUrl: string;
  };
}

// Default configuration
const defaultConfig: AppConfig = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
    timeout: 30000, // 30 seconds
  },
  ui: {
    refreshInterval: parseInt(import.meta.env.VITE_REFRESH_INTERVAL || '30000'), // 30 seconds
    notificationTimeout: parseInt(import.meta.env.VITE_NOTIFICATION_TIMEOUT || '5000'), // 5 seconds
    autoRefresh: import.meta.env.VITE_AUTO_REFRESH !== 'false', // Default true
  },
  deployment: {
    environment: (import.meta.env.MODE as any) || 'development',
    frontendUrl: import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173',
    backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  },
};

// Export the configuration
export const appConfig: AppConfig = defaultConfig;

export const getApiUrl = (endpoint: string): string => {
  return `${appConfig.api.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export const getRefreshInterval = (): number => {
  return appConfig.ui.refreshInterval;
};

export const getCurrency = (): string => {
  return import.meta.env.VITE_CURRENCY || 'NOK';
};

export const formatCurrency = (amount: number): string => {
  const currency = getCurrency();
  const locale = currency === 'NOK' ? 'no-NO' : 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};