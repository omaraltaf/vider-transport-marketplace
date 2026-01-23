/**
 * Geographic Restriction Service
 * Manages geographic restrictions and location-based access controls
 */

import { PrismaClient, GeographicRestriction, RestrictionType, RegionType } from '@prisma/client';
import { getDatabaseClient } from '../config/database';
import { logError } from '../utils/logging.utils';

const prisma = getDatabaseClient();

export interface CreateGeographicRestrictionRequest {
  restrictionType: RestrictionType;
  region: string;
  regionType: RegionType;
  isBlocked: boolean;
  reason?: string;
}

export interface UpdateGeographicRestrictionRequest {
  restrictionType?: RestrictionType;
  region?: string;
  regionType?: RegionType;
  isBlocked?: boolean;
  reason?: string;
}

export interface GeographicRestrictionQuery {
  region?: string;
  regionType?: RegionType;
  restrictionType?: RestrictionType;
  isBlocked?: boolean;
}

export interface RestrictionViolation {
  id: string;
  userId: string;
  region: string;
  regionType: RegionType;
  restrictionType: RestrictionType;
  attemptedAction: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class GeographicRestrictionService {
  /**
   * Create a new geographic restriction
   */
  async createRestriction(
    configId: string,
    data: CreateGeographicRestrictionRequest
  ): Promise<GeographicRestriction> {
    try {
      const restriction = await prisma.geographicRestriction.create({
        data: {
          configId,
          ...data
        }
      });

      return restriction;
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to create geographic restriction');
    }
  }

  /**
   * Get all geographic restrictions for a configuration
   */
  async getRestrictions(
    configId: string,
    query?: GeographicRestrictionQuery
  ): Promise<GeographicRestriction[]> {
    try {
      const where: any = { configId };

      if (query?.region) {
        where.region = { contains: query.region, mode: 'insensitive' };
      }
      if (query?.regionType) {
        where.regionType = query.regionType;
      }
      if (query?.restrictionType) {
        where.restrictionType = query.restrictionType;
      }
      if (query?.isBlocked !== undefined) {
        where.isBlocked = query.isBlocked;
      }

      const restrictions = await prisma.geographicRestriction.findMany({
        where,
        orderBy: [
          { regionType: 'asc' },
          { region: 'asc' }
        ]
      });

      return restrictions;
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to fetch geographic restrictions');
    }
  }

  /**
   * Update a geographic restriction
   */
  async updateRestriction(
    restrictionId: string,
    data: UpdateGeographicRestrictionRequest
  ): Promise<GeographicRestriction> {
    try {
      const restriction = await prisma.geographicRestriction.update({
        where: { id: restrictionId },
        data
      });

      return restriction;
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to update geographic restriction');
    }
  }

  /**
   * Delete a geographic restriction
   */
  async deleteRestriction(restrictionId: string): Promise<void> {
    try {
      await prisma.geographicRestriction.delete({
        where: { id: restrictionId }
      });
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to delete geographic restriction');
    }
  }

  /**
   * Check if a region is restricted for a specific action
   */
  async isRegionRestricted(
    configId: string,
    region: string,
    regionType: RegionType,
    restrictionType: RestrictionType
  ): Promise<boolean> {
    try {
      const restriction = await prisma.geographicRestriction.findFirst({
        where: {
          configId,
          region: { equals: region, mode: 'insensitive' },
          regionType,
          restrictionType,
          isBlocked: true
        }
      });

      return !!restriction;
    } catch (error) {
      logError({ error: error as Error });
      return false; // Default to allowing access if check fails
    }
  }

  /**
   * Check multiple regions for restrictions
   */
  async checkMultipleRegions(
    configId: string,
    regions: Array<{ region: string; regionType: RegionType }>,
    restrictionType: RestrictionType
  ): Promise<Record<string, boolean>> {
    try {
      const regionKeys = regions.map(r => `${r.region}:${r.regionType}`);
      const restrictions = await prisma.geographicRestriction.findMany({
        where: {
          configId,
          restrictionType,
          isBlocked: true,
          OR: regions.map(r => ({
            region: { equals: r.region, mode: 'insensitive' },
            regionType: r.regionType
          }))
        }
      });

      const result: Record<string, boolean> = {};
      regionKeys.forEach(key => {
        result[key] = false; // Default to not restricted
      });

      restrictions.forEach(restriction => {
        const key = `${restriction.region}:${restriction.regionType}`;
        result[key] = true;
      });

      return result;
    } catch (error) {
      logError({ error: error as Error });
      // Default to allowing all regions if check fails
      const result: Record<string, boolean> = {};
      regions.forEach(r => {
        result[`${r.region}:${r.regionType}`] = false;
      });
      return result;
    }
  }

  /**
   * Get restrictions by region hierarchy (country -> fylke -> kommune)
   */
  async getRegionHierarchyRestrictions(
    configId: string,
    country?: string,
    fylke?: string,
    kommune?: string
  ): Promise<GeographicRestriction[]> {
    try {
      const restrictions: GeographicRestriction[] = [];

      // Check country level
      if (country) {
        const countryRestrictions = await prisma.geographicRestriction.findMany({
          where: {
            configId,
            region: { equals: country, mode: 'insensitive' },
            regionType: RegionType.COUNTRY
          }
        });
        restrictions.push(...countryRestrictions);
      }

      // Check fylke level
      if (fylke) {
        const fylkeRestrictions = await prisma.geographicRestriction.findMany({
          where: {
            configId,
            region: { equals: fylke, mode: 'insensitive' },
            regionType: RegionType.FYLKE
          }
        });
        restrictions.push(...fylkeRestrictions);
      }

      // Check kommune level
      if (kommune) {
        const kommuneRestrictions = await prisma.geographicRestriction.findMany({
          where: {
            configId,
            region: { equals: kommune, mode: 'insensitive' },
            regionType: RegionType.KOMMUNE
          }
        });
        restrictions.push(...kommuneRestrictions);
      }

      return restrictions;
    } catch (error) {
      logError({ error: error as Error });
      return [];
    }
  }

  /**
   * Bulk create restrictions
   */
  async bulkCreateRestrictions(
    configId: string,
    restrictions: CreateGeographicRestrictionRequest[]
  ): Promise<GeographicRestriction[]> {
    try {
      const createdRestrictions = await prisma.$transaction(
        restrictions.map(restriction =>
          prisma.geographicRestriction.create({
            data: {
              configId,
              ...restriction
            }
          })
        )
      );

      return createdRestrictions;
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to bulk create geographic restrictions');
    }
  }

  /**
   * Bulk update restrictions
   */
  async bulkUpdateRestrictions(
    updates: Array<{ id: string; data: UpdateGeographicRestrictionRequest }>
  ): Promise<GeographicRestriction[]> {
    try {
      const updatedRestrictions = await prisma.$transaction(
        updates.map(update =>
          prisma.geographicRestriction.update({
            where: { id: update.id },
            data: update.data
          })
        )
      );

      return updatedRestrictions;
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to bulk update geographic restrictions');
    }
  }

  /**
   * Log a restriction violation
   */
  async logViolation(violation: Omit<RestrictionViolation, 'id' | 'timestamp'>): Promise<void> {
    try {
      // For now, just log to console. In a real implementation, 
      // this would be stored in a dedicated violations table
      console.warn('Geographic restriction violation:', {
        ...violation,
        timestamp: new Date()
      });
    } catch (error) {
      logError({ error: error as Error });
    }
  }

  /**
   * Get restriction statistics
   */
  async getRestrictionStats(configId: string): Promise<{
    totalRestrictions: number;
    activeRestrictions: number;
    restrictionsByType: Record<RestrictionType, number>;
    restrictionsByRegionType: Record<RegionType, number>;
  }> {
    try {
      const [
        totalRestrictions,
        activeRestrictions,
        restrictionsByType,
        restrictionsByRegionType
      ] = await Promise.all([
        prisma.geographicRestriction.count({ where: { configId } }),
        prisma.geographicRestriction.count({ where: { configId, isBlocked: true } }),
        prisma.geographicRestriction.groupBy({
          by: ['restrictionType'],
          where: { configId },
          _count: { restrictionType: true }
        }),
        prisma.geographicRestriction.groupBy({
          by: ['regionType'],
          where: { configId },
          _count: { regionType: true }
        })
      ]);

      const typeStats: Record<RestrictionType, number> = {
        [RestrictionType.BOOKING_BLOCKED]: 0,
        [RestrictionType.LISTING_BLOCKED]: 0,
        [RestrictionType.PAYMENT_BLOCKED]: 0,
        [RestrictionType.FEATURE_DISABLED]: 0
      };

      const regionTypeStats: Record<RegionType, number> = {
        [RegionType.COUNTRY]: 0,
        [RegionType.FYLKE]: 0,
        [RegionType.KOMMUNE]: 0
      };

      restrictionsByType.forEach(item => {
        typeStats[item.restrictionType] = item._count.restrictionType;
      });

      restrictionsByRegionType.forEach(item => {
        regionTypeStats[item.regionType] = item._count.regionType;
      });

      return {
        totalRestrictions,
        activeRestrictions,
        restrictionsByType: typeStats,
        restrictionsByRegionType: regionTypeStats
      };
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to get restriction statistics');
    }
  }
}

// Create and export service instance
export const geographicRestrictionService = new GeographicRestrictionService();