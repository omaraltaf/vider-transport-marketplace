/**
 * Feature Toggle Middleware
 * Enforces platform-wide feature toggles across API endpoints and services
 */

import { Request, Response, NextFunction } from 'express';
import { platformConfigService } from '../services/platform-config.service';
import { logError } from '../utils/logging.utils';

export interface FeatureToggleOptions {
  feature: FeatureToggle;
  fallbackResponse?: any;
  allowBypass?: boolean;
}

export enum FeatureToggle {
  WITHOUT_DRIVER_LISTINGS = 'withoutDriverListings',
  HOURLY_BOOKINGS = 'hourlyBookings',
  RECURRING_BOOKINGS = 'recurringBookings',
  INSTANT_BOOKING = 'instantBooking',
  AUTO_APPROVAL = 'autoApprovalEnabled',
  MAINTENANCE_MODE = 'maintenanceMode'
}

/**
 * Middleware to enforce feature toggles on API endpoints
 */
export function requireFeature(options: FeatureToggleOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await platformConfigService.getConfiguration();
      
      if (!config) {
        return res.status(503).json({
          error: {
            code: 'CONFIGURATION_UNAVAILABLE',
            message: 'Platform configuration is not available',
          },
        });
      }

      const featureEnabled = (config as any)[options.feature];

      if (!featureEnabled) {
        // Feature is disabled
        if (options.fallbackResponse) {
          return res.status(200).json(options.fallbackResponse);
        }

        return res.status(403).json({
          error: {
            code: 'FEATURE_DISABLED',
            message: `Feature '${options.feature}' is currently disabled`,
            feature: options.feature,
          },
        });
      }

      // Feature is enabled, continue to next middleware
      next();
    } catch (error) {
      logError({ error: error as Error, request: req });
      
      if (options.allowBypass) {
        // Allow request to continue if bypass is enabled
        next();
      } else {
        res.status(500).json({
          error: {
            code: 'FEATURE_CHECK_FAILED',
            message: 'Unable to verify feature availability',
          },
        });
      }
    }
  };
}

/**
 * Middleware to block requests when maintenance mode is enabled
 */
export function blockInMaintenanceMode(options?: { allowedRoles?: string[] }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await platformConfigService.getConfiguration();
      
      if (!config) {
        return res.status(503).json({
          error: {
            code: 'CONFIGURATION_UNAVAILABLE',
            message: 'Platform configuration is not available',
          },
        });
      }

      if (config.maintenanceMode) {
        // Check if user has allowed role to bypass maintenance mode
        if (options?.allowedRoles && req.user) {
          const userRole = (req.user as any).role;
          if (options.allowedRoles.includes(userRole)) {
            return next();
          }
        }

        return res.status(503).json({
          error: {
            code: 'MAINTENANCE_MODE',
            message: 'Platform is currently in maintenance mode. Please try again later.',
            maintenanceMode: true,
          },
        });
      }

      next();
    } catch (error) {
      logError({ error: error as Error, request: req });
      res.status(500).json({
        error: {
          code: 'MAINTENANCE_CHECK_FAILED',
          message: 'Unable to verify maintenance mode status',
        },
      });
    }
  };
}

/**
 * Utility function to check if a feature is enabled (for use in services)
 */
export async function isFeatureEnabled(feature: FeatureToggle): Promise<boolean> {
  try {
    const config = await platformConfigService.getConfiguration();
    if (!config) {
      return false;
    }
    return (config as any)[feature] || false;
  } catch (error) {
    console.error('Error checking feature toggle:', error);
    return false;
  }
}

/**
 * Utility function to get all feature states
 */
export async function getAllFeatureStates(): Promise<Record<string, boolean>> {
  try {
    const config = await platformConfigService.getConfiguration();
    if (!config) {
      return {};
    }

    return {
      [FeatureToggle.WITHOUT_DRIVER_LISTINGS]: config.withoutDriverListings,
      [FeatureToggle.HOURLY_BOOKINGS]: config.hourlyBookings,
      [FeatureToggle.RECURRING_BOOKINGS]: config.recurringBookings,
      [FeatureToggle.INSTANT_BOOKING]: config.instantBooking,
      [FeatureToggle.AUTO_APPROVAL]: config.autoApprovalEnabled,
      [FeatureToggle.MAINTENANCE_MODE]: config.maintenanceMode,
    };
  } catch (error) {
    console.error('Error getting feature states:', error);
    return {};
  }
}

/**
 * Decorator for service methods to check feature toggles
 */
export function requireFeatureToggle(feature: FeatureToggle) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const featureEnabled = await isFeatureEnabled(feature);
      
      if (!featureEnabled) {
        throw new Error(`Feature '${feature}' is currently disabled`);
      }

      return method.apply(this, args);
    };

    return descriptor;
  };
}