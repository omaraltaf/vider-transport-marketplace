/**
 * ActionableItemsList Component
 * Displays a prioritized list of items requiring immediate attention
 * 
 * Features:
 * - Displays actionable items with priority badges
 * - Visual indicators (icons, badges) for different item types
 * - Click handlers to navigate to relevant pages
 * - Items sorted by priority (high, medium, low)
 * - Uses design system Badge and Button components
 * - Validates Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 7.3, 7.4
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Stack, Badge, Button } from '../../design-system/components';
import { 
  AlertCircle, 
  Clock, 
  MessageSquare, 
  Star, 
  ShieldAlert,
  ChevronRight 
} from 'lucide-react';
import type { ActionableItem } from '../../../src/services/dashboard.service';

export interface ActionableItemsListProps {
  items: ActionableItem[];
}

/**
 * Get icon component for actionable item type
 */
const getItemIcon = (type: ActionableItem['type']) => {
  switch (type) {
    case 'booking_request':
      return AlertCircle;
    case 'expiring_request':
      return Clock;
    case 'unread_message':
      return MessageSquare;
    case 'rating_prompt':
      return Star;
    case 'verification_status':
      return ShieldAlert;
    default:
      return AlertCircle;
  }
};

/**
 * Get icon color for actionable item type
 */
const getIconColor = (type: ActionableItem['type']) => {
  switch (type) {
    case 'booking_request':
      return 'ds-text-primary';
    case 'expiring_request':
      return 'ds-text-error';
    case 'unread_message':
      return 'ds-text-info';
    case 'rating_prompt':
      return 'ds-text-warning';
    case 'verification_status':
      return 'ds-text-warning';
    default:
      return 'ds-text-gray-600';
  }
};

/**
 * Get badge variant for priority level
 */
const getPriorityBadgeVariant = (priority: ActionableItem['priority']): 'error' | 'warning' | 'info' => {
  switch (priority) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'info';
  }
};

/**
 * ActionableItemsList Component
 */
export const ActionableItemsList: React.FC<ActionableItemsListProps> = ({ items }) => {
  const navigate = useNavigate();

  const handleItemClick = (item: ActionableItem) => {
    navigate(item.link);
  };

  if (items.length === 0) {
    return (
      <Card padding="md">
        <Stack spacing={2} align="center" className="py-8">
          <div className="text-4xl">✓</div>
          <p className="text-sm ds-text-gray-600 text-center">
            All caught up! No action items at the moment.
          </p>
        </Stack>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <Stack spacing={3}>
        {items.map((item) => {
          const Icon = getItemIcon(item.type);
          const iconColor = getIconColor(item.type);
          const badgeVariant = getPriorityBadgeVariant(item.priority);

          return (
            <div
              key={item.id}
              className="actionable-item"
              role="article"
              aria-label={`${item.title}: ${item.description}`}
            >
              <button
                onClick={() => handleItemClick(item)}
                className="actionable-item-button"
                aria-label={`View ${item.title}`}
              >
                <Stack direction="horizontal" spacing={3} align="start">
                  {/* Icon */}
                  <div className="actionable-item-icon">
                    <Icon 
                      className={`h-5 w-5 ${iconColor}`} 
                      aria-hidden="true"
                    />
                  </div>

                  {/* Content */}
                  <div className="actionable-item-content">
                    <Stack spacing={1}>
                      {/* Title and Badge */}
                      <Stack direction="horizontal" spacing={2} align="center" className="flex-wrap">
                        <h3 className="text-sm font-medium ds-text-gray-900">
                          {item.title}
                        </h3>
                        <Badge 
                          variant={badgeVariant} 
                          size="sm"
                          aria-label={`Priority: ${item.priority}`}
                        >
                          {item.priority}
                        </Badge>
                      </Stack>

                      {/* Description */}
                      <p className="text-sm ds-text-gray-600">
                        {item.description}
                      </p>
                    </Stack>
                  </div>

                  {/* Arrow Icon */}
                  <div className="actionable-item-arrow">
                    <ChevronRight 
                      className="h-5 w-5 ds-text-gray-400" 
                      aria-hidden="true"
                    />
                  </div>
                </Stack>
              </button>
            </div>
          );
        })}
      </Stack>

      <style>{`
        .actionable-item {
          border-bottom: 1px solid var(--color-gray-200);
        }

        .actionable-item:last-child {
          border-bottom: none;
        }

        .actionable-item-button {
          width: 100%;
          padding: 0.75rem 0;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background-color 0.2s ease;
          border-radius: 0.375rem;
        }

        .actionable-item-button:hover {
          background-color: var(--color-gray-50);
        }

        .actionable-item-button:focus {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }

        .actionable-item-button:active {
          background-color: var(--color-gray-100);
        }

        .actionable-item-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--color-gray-100);
        }

        .actionable-item-content {
          flex: 1;
          min-width: 0;
        }

        .actionable-item-arrow {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          transition: transform 0.2s ease;
        }

        .actionable-item-button:hover .actionable-item-arrow {
          transform: translateX(4px);
        }

        /* Mobile optimizations - ensure touch targets are at least 44x44px */
        @media (max-width: 767px) {
          .actionable-item-button {
            min-height: 44px;
            padding: 0.75rem 0.5rem;
          }

          .actionable-item-icon {
            width: 36px;
            height: 36px;
          }

          .actionable-item-content h3 {
            font-size: 0.875rem; /* 14px */
          }

          .actionable-item-content p {
            font-size: 0.75rem; /* 12px */
          }
        }

        /* Tablet optimizations */
        @media (min-width: 768px) and (max-width: 1023px) {
          .actionable-item-button {
            padding: 0.625rem 0;
          }
        }
      `}</style>
    </Card>
  );
};
