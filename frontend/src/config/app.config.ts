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
    baseUrl: 'https://vider-transport-marketplace-production-bd63.up.railway.app/api', // Hardcoded for immediate fix
    timeout: 30000, // 30 seconds
  },
  ui: {
    refreshInterval: parseInt(import.meta.env.VITE_REFRESH_INTERVAL || '30000'), // 30 seconds
    notificationTimeout: parseInt(import.meta.env.VITE_NOTIFICATION_TIMEOUT || '5000'), // 5 seconds
    autoRefresh: import.meta.env.VITE_AUTO_REFRESH !== 'false', // Default true
  },
  deployment: {
    environment: 'production', // Hardcoded for immediate fix
    frontendUrl: 'https://vider.no', // Hardcoded for immediate fix
    backendUrl: 'https://vider-transport-marketplace-production-bd63.up.railway.app', // Hardcoded for immediate fix
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