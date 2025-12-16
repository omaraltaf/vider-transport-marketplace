/**
 * Restriction Monitoring Service
 * Monitors and reports on restriction violations and enforcement
 */

import { PrismaClient, RestrictionType, RegionType, PaymentMethod } from '@prisma/client';
import { prisma } from '../config/database';
import { logError } from '../utils/logging.utils';

export interface RestrictionViolation {
  id: string;
  type: 'geographic' | 'payment_method';
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  region?: string;
  regionType?: RegionType;
  restrictionType?: RestrictionType;
  paymentMethod?: PaymentMethod;
  attemptedAction: string;
  endpoint: string;
  timestamp: Date;
  blocked: boolean;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface ViolationQuery {
  type?: 'geographic' | 'payment_method';
  userId?: string;
  region?: string;
  restrictionType?: RestrictionType;
  paymentMethod?: PaymentMethod;
  blocked?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ViolationStats {
  totalViolations: number;
  blockedAttempts: number;
  allowedAttempts: number;
  violationsByType: Record<'geographic' | 'payment_method', number>;
  violationsByRegion: Record<string, number>;
  violationsByRestrictionType: Record<RestrictionType, number>;
  violationsByPaymentMethod: Record<PaymentMethod, number>;
  violationsByHour: Array<{ hour: number; count: number }>;
  topViolatingIPs: Array<{ ipAddress: string; count: number }>;
  topViolatingUsers: Array<{ userId: string; count: number }>;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    violationType?: 'geographic' | 'payment_method';
    threshold: number;
    timeWindow: number; // minutes
    region?: string;
    restrictionType?: RestrictionType;
    paymentMethod?: PaymentMethod;
  };
  actions: {
    email?: string[];
    webhook?: string;
    autoBlock?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class RestrictionMonitoringService {
  private violations: RestrictionViolation[] = [];
  private alertRules: AlertRule[] = [];

  /**
   * Log a restriction violation
   */
  async logViolation(violation: Omit<RestrictionViolation, 'id' | 'timestamp'>): Promise<void> {
    try {
      const violationRecord: RestrictionViolation = {
        ...violation,
        id: this.generateId(),
        timestamp: new Date()
      };

      // Store in memory (in production, this would be stored in database)
      this.violations.push(violationRecord);

      // Keep only last 10000 violations in memory
      if (this.violations.length > 10000) {
        this.violations = this.violations.slice(-10000);
      }

      // Check alert rules
      await this.checkAlertRules(violationRecord);

      // Log to console for debugging
      console.warn('Restriction violation logged:', {
        type: violation.type,
        userId: violation.userId,
        region: violation.region,
        restrictionType: violation.restrictionType,
        paymentMethod: violation.paymentMethod,
        blocked: violation.blocked,
        endpoint: violation.endpoint
      });
    } catch (error) {
      logError({ error: error as Error });
    }
  }

  /**
   * Get violations with filtering and pagination
   */
  async getViolations(query: ViolationQuery = {}): Promise<{
    violations: RestrictionViolation[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      let filteredViolations = [...this.violations];

      // Apply filters
      if (query.type) {
        filteredViolations = filteredViolations.filter(v => v.type === query.type);
      }
      if (query.userId) {
        filteredViolations = filteredViolations.filter(v => v.userId === query.userId);
      }
      if (query.region) {
        filteredViolations = filteredViolations.filter(v => v.region === query.region);
      }
      if (query.restrictionType) {
        filteredViolations = filteredViolations.filter(v => v.restrictionType === query.restrictionType);
      }
      if (query.paymentMethod) {
        filteredViolations = filteredViolations.filter(v => v.paymentMethod === query.paymentMethod);
      }
      if (query.blocked !== undefined) {
        filteredViolations = filteredViolations.filter(v => v.blocked === query.blocked);
      }
      if (query.startDate) {
        filteredViolations = filteredViolations.filter(v => v.timestamp >= query.startDate!);
      }
      if (query.endDate) {
        filteredViolations = filteredViolations.filter(v => v.timestamp <= query.endDate!);
      }

      // Sort by timestamp (newest first)
      filteredViolations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      const total = filteredViolations.length;
      const offset = query.offset || 0;
      const limit = query.limit || 100;

      const paginatedViolations = filteredViolations.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      return {
        violations: paginatedViolations,
        total,
        hasMore
      };
    } catch (error) {
      logError({ error: error as Error });
      return { violations: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get violation statistics
   */
  async getViolationStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<ViolationStats> {
    try {
      let violations = [...this.violations];

      // Apply date filters
      if (startDate) {
        violations = violations.filter(v => v.timestamp >= startDate);
      }
      if (endDate) {
        violations = violations.filter(v => v.timestamp <= endDate);
      }

      const totalViolations = violations.length;
      const blockedAttempts = violations.filter(v => v.blocked).length;
      const allowedAttempts = totalViolations - blockedAttempts;

      // Violations by type
      const violationsByType: Record<'geographic' | 'payment_method', number> = {
        geographic: violations.filter(v => v.type === 'geographic').length,
        payment_method: violations.filter(v => v.type === 'payment_method').length
      };

      // Violations by region
      const violationsByRegion: Record<string, number> = {};
      violations.forEach(v => {
        if (v.region) {
          violationsByRegion[v.region] = (violationsByRegion[v.region] || 0) + 1;
        }
      });

      // Violations by restriction type
      const violationsByRestrictionType: Record<RestrictionType, number> = {
        [RestrictionType.BOOKING_BLOCKED]: 0,
        [RestrictionType.LISTING_BLOCKED]: 0,
        [RestrictionType.PAYMENT_BLOCKED]: 0,
        [RestrictionType.FEATURE_DISABLED]: 0
      };
      violations.forEach(v => {
        if (v.restrictionType) {
          violationsByRestrictionType[v.restrictionType]++;
        }
      });

      // Violations by payment method
      const violationsByPaymentMethod: Record<PaymentMethod, number> = {
        [PaymentMethod.CREDIT_CARD]: 0,
        [PaymentMethod.DEBIT_CARD]: 0,
        [PaymentMethod.BANK_TRANSFER]: 0,
        [PaymentMethod.VIPPS]: 0,
        [PaymentMethod.KLARNA]: 0,
        [PaymentMethod.PAYPAL]: 0,
        [PaymentMethod.INVOICE]: 0
      };
      violations.forEach(v => {
        if (v.paymentMethod) {
          violationsByPaymentMethod[v.paymentMethod]++;
        }
      });

      // Violations by hour
      const violationsByHour: Array<{ hour: number; count: number }> = [];
      for (let hour = 0; hour < 24; hour++) {
        const count = violations.filter(v => v.timestamp.getHours() === hour).length;
        violationsByHour.push({ hour, count });
      }

      // Top violating IPs
      const ipCounts: Record<string, number> = {};
      violations.forEach(v => {
        if (v.ipAddress) {
          ipCounts[v.ipAddress] = (ipCounts[v.ipAddress] || 0) + 1;
        }
      });
      const topViolatingIPs = Object.entries(ipCounts)
        .map(([ipAddress, count]) => ({ ipAddress, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top violating users
      const userCounts: Record<string, number> = {};
      violations.forEach(v => {
        if (v.userId) {
          userCounts[v.userId] = (userCounts[v.userId] || 0) + 1;
        }
      });
      const topViolatingUsers = Object.entries(userCounts)
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalViolations,
        blockedAttempts,
        allowedAttempts,
        violationsByType,
        violationsByRegion,
        violationsByRestrictionType,
        violationsByPaymentMethod,
        violationsByHour,
        topViolatingIPs,
        topViolatingUsers
      };
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to get violation statistics');
    }
  }

  /**
   * Create an alert rule
   */
  async createAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule> {
    try {
      const alertRule: AlertRule = {
        ...rule,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.alertRules.push(alertRule);
      return alertRule;
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to create alert rule');
    }
  }

  /**
   * Update an alert rule
   */
  async updateAlertRule(
    ruleId: string,
    updates: Partial<Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<AlertRule> {
    try {
      const ruleIndex = this.alertRules.findIndex(r => r.id === ruleId);
      if (ruleIndex === -1) {
        throw new Error('Alert rule not found');
      }

      this.alertRules[ruleIndex] = {
        ...this.alertRules[ruleIndex],
        ...updates,
        updatedAt: new Date()
      };

      return this.alertRules[ruleIndex];
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to update alert rule');
    }
  }

  /**
   * Delete an alert rule
   */
  async deleteAlertRule(ruleId: string): Promise<void> {
    try {
      const ruleIndex = this.alertRules.findIndex(r => r.id === ruleId);
      if (ruleIndex === -1) {
        throw new Error('Alert rule not found');
      }

      this.alertRules.splice(ruleIndex, 1);
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to delete alert rule');
    }
  }

  /**
   * Get all alert rules
   */
  async getAlertRules(): Promise<AlertRule[]> {
    return [...this.alertRules];
  }

  /**
   * Check alert rules against a violation
   */
  private async checkAlertRules(violation: RestrictionViolation): Promise<void> {
    try {
      const enabledRules = this.alertRules.filter(r => r.enabled);

      for (const rule of enabledRules) {
        if (await this.shouldTriggerAlert(rule, violation)) {
          await this.triggerAlert(rule, violation);
        }
      }
    } catch (error) {
      logError({ error: error as Error });
    }
  }

  /**
   * Check if an alert should be triggered
   */
  private async shouldTriggerAlert(rule: AlertRule, violation: RestrictionViolation): Promise<boolean> {
    try {
      const { conditions } = rule;

      // Check violation type
      if (conditions.violationType && violation.type !== conditions.violationType) {
        return false;
      }

      // Check region
      if (conditions.region && violation.region !== conditions.region) {
        return false;
      }

      // Check restriction type
      if (conditions.restrictionType && violation.restrictionType !== conditions.restrictionType) {
        return false;
      }

      // Check payment method
      if (conditions.paymentMethod && violation.paymentMethod !== conditions.paymentMethod) {
        return false;
      }

      // Check threshold within time window
      const timeWindowStart = new Date(Date.now() - conditions.timeWindow * 60 * 1000);
      const recentViolations = this.violations.filter(v => {
        if (v.timestamp < timeWindowStart) return false;
        if (conditions.violationType && v.type !== conditions.violationType) return false;
        if (conditions.region && v.region !== conditions.region) return false;
        if (conditions.restrictionType && v.restrictionType !== conditions.restrictionType) return false;
        if (conditions.paymentMethod && v.paymentMethod !== conditions.paymentMethod) return false;
        return true;
      });

      return recentViolations.length >= conditions.threshold;
    } catch (error) {
      logError({ error: error as Error });
      return false;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(rule: AlertRule, violation: RestrictionViolation): Promise<void> {
    try {
      console.warn(`ALERT TRIGGERED: ${rule.name}`, {
        rule: rule.name,
        violation: {
          type: violation.type,
          region: violation.region,
          restrictionType: violation.restrictionType,
          paymentMethod: violation.paymentMethod,
          timestamp: violation.timestamp
        }
      });

      // In a real implementation, this would:
      // - Send emails to rule.actions.email
      // - Call webhook at rule.actions.webhook
      // - Auto-block if rule.actions.autoBlock is true
    } catch (error) {
      logError({ error: error as Error });
    }
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear old violations (cleanup)
   */
  async cleanupOldViolations(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      const initialCount = this.violations.length;
      
      this.violations = this.violations.filter(v => v.timestamp >= cutoffDate);
      
      const removedCount = initialCount - this.violations.length;
      
      if (removedCount > 0) {
        console.log(`Cleaned up ${removedCount} old violation records`);
      }
      
      return removedCount;
    } catch (error) {
      logError({ error: error as Error });
      return 0;
    }
  }

  /**
   * Export violations to CSV format
   */
  async exportViolations(query: ViolationQuery = {}): Promise<string> {
    try {
      const { violations } = await this.getViolations(query);
      
      const headers = [
        'Timestamp',
        'Type',
        'User ID',
        'IP Address',
        'Region',
        'Region Type',
        'Restriction Type',
        'Payment Method',
        'Attempted Action',
        'Endpoint',
        'Blocked',
        'Reason'
      ];
      
      const csvRows = [
        headers.join(','),
        ...violations.map(v => [
          v.timestamp.toISOString(),
          v.type,
          v.userId || '',
          v.ipAddress || '',
          v.region || '',
          v.regionType || '',
          v.restrictionType || '',
          v.paymentMethod || '',
          v.attemptedAction,
          v.endpoint,
          v.blocked.toString(),
          v.reason || ''
        ].map(field => `"${field}"`).join(','))
      ];
      
      return csvRows.join('\n');
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to export violations');
    }
  }
}

// Create and export service instance
export const restrictionMonitoringService = new RestrictionMonitoringService();