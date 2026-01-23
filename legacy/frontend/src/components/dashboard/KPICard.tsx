/**
 * KPICard Component
 * Displays a single Key Performance Indicator with optional icon and trend
 * 
 * Features:
 * - Displays metric title, value, and optional subtitle
 * - Supports icons for visual clarity
 * - Responsive design
 * - Accessible with proper ARIA labels
 * - Validates Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 7.2, 7.4
 */

import React from 'react';
import { Card, Stack } from '../../design-system/components';
import type { LucideIcon } from 'lucide-react';

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  'aria-label'?: string;
}

/**
 * Formats a number as currency with 2 decimal places
 * Validates: Requirements 7.2
 */
export function formatCurrency(value: number): string {
  return `kr ${value.toFixed(2)}`;
}

/**
 * Formats a number as percentage with 1 decimal place
 * Validates: Requirements 7.2
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Formats a rating with 1 decimal place
 * Validates: Requirements 7.2
 */
export function formatRating(value: number): string {
  return value.toFixed(1);
}

/**
 * Formats an integer count
 * Validates: Requirements 7.2
 */
export function formatCount(value: number): string {
  return Math.floor(value).toString();
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'ds-text-primary',
  'aria-label': ariaLabel,
}) => {
  return (
    <Card 
      padding="md" 
      className="kpi-card"
      aria-label={ariaLabel || `${title}: ${value}`}
      role="article"
    >
      <Stack spacing={2}>
        {/* Icon and Title Row */}
        <Stack direction="horizontal" spacing={2} align="center" justify="between">
          <h3 className="text-sm font-medium ds-text-gray-600">{title}</h3>
          {Icon && (
            <Icon 
              className={`h-5 w-5 ${iconColor}`} 
              aria-hidden="true"
            />
          )}
        </Stack>

        {/* Value */}
        <div className="text-2xl font-bold ds-text-gray-900">
          {value}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs ds-text-gray-500">
            {subtitle}
          </p>
        )}
      </Stack>

      <style>{`
        .kpi-card {
          min-height: 120px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .kpi-card:focus-within {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }

        /* Mobile optimizations - ensure proper spacing and readability */
        @media (max-width: 767px) {
          .kpi-card {
            min-height: 100px;
          }

          .kpi-card h3 {
            font-size: 0.75rem; /* 12px */
          }

          .kpi-card .text-2xl {
            font-size: 1.5rem; /* 24px */
          }

          .kpi-card .text-xs {
            font-size: 0.625rem; /* 10px */
          }
        }

        /* Tablet optimizations */
        @media (min-width: 768px) and (max-width: 1023px) {
          .kpi-card {
            min-height: 110px;
          }
        }
      `}</style>
    </Card>
  );
};
