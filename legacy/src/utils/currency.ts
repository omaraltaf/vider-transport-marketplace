/**
 * Centralized Currency Utilities
 * Provides consistent currency formatting and handling across the platform
 */

export const PLATFORM_CURRENCY = 'NOK';
export const PLATFORM_LOCALE = 'no-NO';

/**
 * Format currency amount with consistent Norwegian formatting
 */
export function formatCurrency(amount: number, currency: string = PLATFORM_CURRENCY): string {
  return new Intl.NumberFormat(PLATFORM_LOCALE, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format currency amount without currency symbol (for input fields)
 */
export function formatCurrencyValue(amount: number): string {
  return new Intl.NumberFormat(PLATFORM_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and spaces, replace comma with dot
  const cleanValue = value
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.');
  
  return parseFloat(cleanValue) || 0;
}

/**
 * Validate currency amount
 */
export function isValidCurrencyAmount(amount: number): boolean {
  return !isNaN(amount) && isFinite(amount) && amount >= 0;
}

/**
 * Round currency amount to 2 decimal places
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Format percentage with Norwegian formatting
 */
export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

/**
 * Format large numbers with appropriate suffix (K, M)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Currency configuration for different contexts
 */
export const CURRENCY_CONFIG = {
  default: PLATFORM_CURRENCY,
  supported: ['NOK', 'EUR', 'USD'] as const,
  symbols: {
    NOK: 'kr',
    EUR: '€',
    USD: '$'
  } as const
};

export type SupportedCurrency = typeof CURRENCY_CONFIG.supported[number];