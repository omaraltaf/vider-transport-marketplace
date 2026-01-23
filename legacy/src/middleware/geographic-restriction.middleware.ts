/**
 * Geographic Restriction Middleware
 * Enforces geographic restrictions on API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { RestrictionType, RegionType } from '@prisma/client';
import { geographicRestrictionService } from '../services/geographic-restriction.service';
import { platformConfigService } from '../services/platform-config.service';
import { restrictionMonitoringService } from '../services/restriction-monitoring.service';
import { logError } from '../utils/logging.utils';

export interface GeographicRestrictionOptions {
  restrictionType: RestrictionType;
  regionExtractor?: (req: Request) => Promise<{ region: string; regionType: RegionType } | null>;
  fallbackResponse?: any;
  allowBypass?: boolean;
}

/**
 * Default region extractor that tries to get region from various sources
 */
async function defaultRegionExtractor(req: Request): Promise<{ region: string; regionType: RegionType } | null> {
  // Try to get region from request body
  if (req.body?.region && req.body?.regionType) {
    return {
      region: req.body.region,
      regionType: req.body.regionType
    };
  }

  // Try to get region from query parameters
  if (req.query?.region && req.query?.regionType) {
    return {
      region: req.query.region as string,
      regionType: req.query.regionType as RegionType
    };
  }

  // Try to get region from user profile (if available)
  if (req.user && (req.user as any).region) {
    return {
      region: (req.user as any).region,
      regionType: (req.user as any).regionType || RegionType.COUNTRY
    };
  }

  // Try to extract from IP address (simplified - in real implementation would use GeoIP)
  const clientIP = req.ip || req.connection.remoteAddress;
  if (clientIP) {
    // This is a placeholder - in real implementation, you'd use a GeoIP service
    // For now, we'll assume Norway as default
    return {
      region: 'Norway',
      regionType: RegionType.COUNTRY
    };
  }

  return null;
}

/**
 * Middleware to enforce geographic restrictions
 */
export function requireGeographicAccess(options: GeographicRestrictionOptions) {
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

      // Extract region information
      const regionExtractor = options.regionExtractor || defaultRegionExtractor;
      const regionInfo = await regionExtractor(req);

      if (!regionInfo) {
        if (options.allowBypass) {
          return next();
        }
        
        return res.status(400).json({
          error: {
            code: 'REGION_REQUIRED',
            message: 'Region information is required for this operation',
          },
        });
      }

      // Check if region is restricted
      const isRestricted = await geographicRestrictionService.isRegionRestricted(
        config.id,
        regionInfo.region,
        regionInfo.regionType,
        options.restrictionType
      );

      if (isRestricted) {
        // Log the violation using monitoring service
        await restrictionMonitoringService.logViolation({
          type: 'geographic',
          userId: (req.user as any)?.id,
          sessionId: req.session?.id || 'no-session',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          region: regionInfo.region,
          regionType: regionInfo.regionType,
          restrictionType: options.restrictionType,
          attemptedAction: `${req.method} ${req.path}`,
          endpoint: req.originalUrl,
          blocked: true,
          reason: `Geographic restriction enforced for ${regionInfo.region}`,
          metadata: {
            headers: req.headers,
            query: req.query,
            body: req.body
          }
        });

        if (options.fallbackResponse) {
          return res.status(200).json(options.fallbackResponse);
        }

        return res.status(403).json({
          error: {
            code: 'GEOGRAPHIC_RESTRICTION',
            message: `Access denied for region ${regionInfo.region} (${regionInfo.regionType})`,
            restrictionType: options.restrictionType,
            region: regionInfo.region,
            regionType: regionInfo.regionType,
          },
        });
      }

      // Add region info to request for downstream use
      (req as any).regionInfo = regionInfo;
      next();
    } catch (error) {
      logError({ error: error as Error, request: req });
      
      if (options.allowBypass) {
        next();
      } else {
        res.status(500).json({
          error: {
            code: 'GEOGRAPHIC_CHECK_FAILED',
            message: 'Unable to verify geographic access',
          },
        });
      }
    }
  };
}

/**
 * Middleware to check booking restrictions by region
 */
export function requireBookingAccess(regionExtractor?: (req: Request) => Promise<{ region: string; regionType: RegionType } | null>) {
  return requireGeographicAccess({
    restrictionType: RestrictionType.BOOKING_BLOCKED,
    regionExtractor,
    allowBypass: false
  });
}

/**
 * Middleware to check listing restrictions by region
 */
export function requireListingAccess(regionExtractor?: (req: Request) => Promise<{ region: string; regionType: RegionType } | null>) {
  return requireGeographicAccess({
    restrictionType: RestrictionType.LISTING_BLOCKED,
    regionExtractor,
    allowBypass: false
  });
}

/**
 * Middleware to check payment restrictions by region
 */
export function requirePaymentAccess(regionExtractor?: (req: Request) => Promise<{ region: string; regionType: RegionType } | null>) {
  return requireGeographicAccess({
    restrictionType: RestrictionType.PAYMENT_BLOCKED,
    regionExtractor,
    allowBypass: false
  });
}

/**
 * Utility function to check geographic access (for use in services)
 */
export async function checkGeographicAccess(
  region: string,
  regionType: RegionType,
  restrictionType: RestrictionType
): Promise<boolean> {
  try {
    const config = await platformConfigService.getConfiguration();
    if (!config) {
      return false;
    }

    const isRestricted = await geographicRestrictionService.isRegionRestricted(
      config.id,
      region,
      regionType,
      restrictionType
    );

    return !isRestricted;
  } catch (error) {
    console.error('Error checking geographic access:', error);
    return false;
  }
}

/**
 * Utility function to get all restricted regions for a restriction type
 */
export async function getRestrictedRegions(restrictionType: RestrictionType): Promise<Array<{ region: string; regionType: RegionType }>> {
  try {
    const config = await platformConfigService.getConfiguration();
    if (!config) {
      return [];
    }

    const restrictions = await geographicRestrictionService.getRestrictions(config.id, {
      restrictionType,
      isBlocked: true
    });

    return restrictions.map(r => ({
      region: r.region,
      regionType: r.regionType
    }));
  } catch (error) {
    console.error('Error getting restricted regions:', error);
    return [];
  }
}