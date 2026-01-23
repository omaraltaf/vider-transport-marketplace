/**
 * User Activity Monitoring Service
 * Comprehensive user activity logging, suspicious activity detection, and behavior analytics
 */

import { PrismaClient } from '@prisma/client';
import { redis } from '../config/redis';
import { UserActivity, PlatformUser } from './platform-admin-user.service';
import { getDatabaseClient } from '../config/database';

const prisma = getDatabaseClient();


export interface ActivityPattern {
  id: string;
  name: string;
  description: string;
  type: 'SUSPICIOUS' | 'NORMAL' | 'FRAUD_INDICATOR' | 'SECURITY_RISK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  conditions: PatternCondition[];
  actions: PatternAction[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatternCondition {
  field: string;
  operator: 'EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'IN_RANGE' | 'TIME_WINDOW';
  value: any;
  timeWindow?: number; // in minutes
}

export interface PatternAction {
  type: 'FLAG_USER' | 'SUSPEND_USER' | 'SEND_ALERT' | 'INCREASE_RISK_SCORE' | 'REQUIRE_VERIFICATION';
  parameters: Record<string, any>;
}

export interface SuspiciousActivityAlert {
  id: string;
  userId: string;
  user: PlatformUser;
  patternId: string;
  patternName: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  triggeringActivities: UserActivity[];
  riskScore: number;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  assignedTo?: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolutionNotes?: string;
}

export interface UserBehaviorAnalytics {
  userId: string;
  timeframe: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  period: string; // e.g., "2024-12-13" for daily
  metrics: {
    loginCount: number;
    uniqueIpAddresses: number;
    bookingCount: number;
    paymentCount: number;
    averageSessionDuration: number;
    deviceCount: number;
    locationCount: number;
    riskEvents: number;
  };
  patterns: {
    mostActiveHours: number[];
    commonLocations: string[];
    deviceFingerprints: string[];
    behaviorScore: number;
  };
  anomalies: {
    unusualLoginTimes: boolean;
    newDevices: boolean;
    newLocations: boolean;
    rapidActions: boolean;
    suspiciousPatterns: string[];
  };
  calculatedAt: Date;
}

export interface EngagementMetrics {
  userId: string;
  period: string;
  metrics: {
    sessionCount: number;
    totalSessionTime: number;
    averageSessionTime: number;
    pageViews: number;
    featureUsage: Record<string, number>;
    conversionEvents: number;
    retentionScore: number;
    engagementScore: number;
  };
  trends: {
    sessionTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
    usageTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
    riskTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  };
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  category: 'USER_MANAGEMENT' | 'CONTENT_MODERATION' | 'FINANCIAL' | 'SYSTEM_CONFIG' | 'SECURITY';
  targetType: 'USER' | 'COMPANY' | 'BOOKING' | 'CONTENT' | 'SYSTEM';
  targetId: string;
  changes: {
    field: string;
    previousValue: any;
    newValue: any;
  }[];
  reason?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class UserActivityMonitoringService {
  private readonly CACHE_TTL = 1800; // 30 minutes
  private readonly RISK_SCORE_THRESHOLD = 70;
  private readonly ALERT_THRESHOLD = 80;

  /**
   * Log user activity with automatic pattern detection
   */
  async logActivity(activity: Omit<UserActivity, 'id'>): Promise<UserActivity> {
    const activityWithId: UserActivity = {
      ...activity,
      id: `activity-${Date.now()}`
    };

    // In real implementation, save to database
    // await prisma.userActivity.create({ data: activityWithId });

    // Check for suspicious patterns
    await this.checkSuspiciousPatterns(activityWithId);

    // Update user behavior analytics
    await this.updateBehaviorAnalytics(activity.userId, activityWithId);

    return activityWithId;
  }

  /**
   * Detect suspicious activity patterns
   */
  async detectSuspiciousActivity(): Promise<SuspiciousActivityAlert[]> {
    const cacheKey = 'suspicious_activity_alerts';
    
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Mock suspicious activity alerts
    const alerts: SuspiciousActivityAlert[] = [
      {
        id: 'alert-1',
        userId: 'user-suspicious-1',
        user: {
          id: 'user-suspicious-1',
          email: 'suspicious@example.com',
          firstName: 'Suspicious',
          lastName: 'User',
          role: 'CUSTOMER',
          status: 'ACTIVE',
          verificationStatus: 'UNVERIFIED',
          kycStatus: 'NOT_STARTED',
          registrationDate: new Date('2024-12-10'),
          loginCount: 50,
          profileCompleteness: 40,
          riskScore: 85,
          flags: [],
          permissions: [],
          metadata: {},
          createdAt: new Date('2024-12-10'),
          updatedAt: new Date('2024-12-13')
        },
        patternId: 'pattern-1',
        patternName: 'Rapid Login Attempts',
        severity: 'HIGH',
        description: 'User attempted to login 15 times in 5 minutes from different IP addresses',
        triggeringActivities: [
          {
            id: 'activity-1',
            userId: 'user-suspicious-1',
            action: 'LOGIN_ATTEMPT',
            category: 'LOGIN',
            details: { success: false, reason: 'invalid_password' },
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0',
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            riskScore: 25,
            flagged: true
          }
        ],
        riskScore: 85,
        status: 'OPEN',
        createdAt: new Date(Date.now() - 10 * 60 * 1000)
      },
      {
        id: 'alert-2',
        userId: 'user-suspicious-2',
        user: {
          id: 'user-suspicious-2',
          email: 'fraud@temp.com',
          firstName: 'Potential',
          lastName: 'Fraud',
          role: 'CUSTOMER',
          status: 'SUSPENDED',
          verificationStatus: 'REJECTED',
          kycStatus: 'REJECTED',
          registrationDate: new Date('2024-12-12'),
          loginCount: 3,
          profileCompleteness: 20,
          riskScore: 95,
          flags: [],
          permissions: [],
          metadata: {},
          createdAt: new Date('2024-12-12'),
          updatedAt: new Date('2024-12-13')
        },
        patternId: 'pattern-2',
        patternName: 'Multiple Payment Card Attempts',
        severity: 'CRITICAL',
        description: 'User attempted payments with 8 different credit cards in 10 minutes',
        triggeringActivities: [],
        riskScore: 95,
        status: 'INVESTIGATING',
        assignedTo: 'admin-security-1',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];

    await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(alerts));
    return alerts;
  }

  /**
   * Get user behavior analytics
   */
  async getUserBehaviorAnalytics(
    userId: string,
    timeframe: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'WEEKLY'
  ): Promise<UserBehaviorAnalytics[]> {
    const cacheKey = `behavior_analytics:${userId}:${timeframe}`;
    
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Generate mock behavior analytics
    const analytics: UserBehaviorAnalytics[] = [];
    const periods = timeframe === 'DAILY' ? 7 : timeframe === 'WEEKLY' ? 4 : 3;

    for (let i = 0; i < periods; i++) {
      const date = new Date();
      if (timeframe === 'DAILY') {
        date.setDate(date.getDate() - i);
      } else if (timeframe === 'WEEKLY') {
        date.setDate(date.getDate() - (i * 7));
      } else {
        date.setMonth(date.getMonth() - i);
      }

      const period = timeframe === 'DAILY' 
        ? date.toISOString().split('T')[0]
        : timeframe === 'WEEKLY'
        ? `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      analytics.push({
        userId,
        timeframe,
        period,
        metrics: {
          loginCount: Math.floor(Math.random() * 10) + 1,
          uniqueIpAddresses: Math.floor(Math.random() * 3) + 1,
          bookingCount: Math.floor(Math.random() * 5),
          paymentCount: Math.floor(Math.random() * 5),
          averageSessionDuration: Math.floor(Math.random() * 30) + 10, // minutes
          deviceCount: Math.floor(Math.random() * 2) + 1,
          locationCount: Math.floor(Math.random() * 3) + 1,
          riskEvents: Math.floor(Math.random() * 3)
        },
        patterns: {
          mostActiveHours: [9, 10, 14, 15, 18, 19],
          commonLocations: ['Oslo', 'Bergen'],
          deviceFingerprints: ['desktop-chrome', 'mobile-safari'],
          behaviorScore: Math.floor(Math.random() * 40) + 60
        },
        anomalies: {
          unusualLoginTimes: Math.random() > 0.8,
          newDevices: Math.random() > 0.9,
          newLocations: Math.random() > 0.85,
          rapidActions: Math.random() > 0.9,
          suspiciousPatterns: Math.random() > 0.8 ? ['rapid_clicks', 'unusual_navigation'] : []
        },
        calculatedAt: new Date()
      });
    }

    await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(analytics));
    return analytics;
  }

  /**
   * Get user activity log
   */
  async getUserActivity(
    userId: string,
    filters?: {
      category?: string;
      dateRange?: { start: Date; end: Date };
      limit?: number;
      offset?: number;
    }
  ): Promise<{ activities: UserActivity[]; total: number }> {
    // Mock activity data for development
    const mockActivities: UserActivity[] = [
      {
        id: 'activity-1',
        userId,
        action: 'LOGIN',
        category: 'LOGIN',
        details: { method: 'email_password' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        location: { country: 'Norway', city: 'Oslo' },
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        riskScore: 5,
        flagged: false
      },
      {
        id: 'activity-2',
        userId,
        action: 'BOOKING_CREATED',
        category: 'BOOKING',
        details: { bookingId: 'booking-123', amount: 2500 },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        location: { country: 'Norway', city: 'Oslo' },
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        riskScore: 2,
        flagged: false
      }
    ];

    // Apply filters
    let filteredActivities = mockActivities;
    
    if (filters?.category) {
      filteredActivities = filteredActivities.filter(a => a.category === filters.category);
    }

    if (filters?.dateRange) {
      filteredActivities = filteredActivities.filter(a => 
        a.timestamp >= filters.dateRange!.start && a.timestamp <= filters.dateRange!.end
      );
    }

    const total = filteredActivities.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    const activities = filteredActivities.slice(offset, offset + limit);

    return { activities, total };
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(userId: string): Promise<EngagementMetrics[]> {
    // Mock engagement metrics for the last 6 months
    const metrics: EngagementMetrics[] = [];
    
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const sessionCount = Math.floor(Math.random() * 20) + 5;
      const totalSessionTime = sessionCount * (Math.floor(Math.random() * 30) + 10);

      metrics.push({
        userId,
        period,
        metrics: {
          sessionCount,
          totalSessionTime,
          averageSessionTime: Math.floor(totalSessionTime / sessionCount),
          pageViews: sessionCount * (Math.floor(Math.random() * 10) + 5),
          featureUsage: {
            'booking_creation': Math.floor(Math.random() * 10),
            'profile_update': Math.floor(Math.random() * 5),
            'payment_method': Math.floor(Math.random() * 3),
            'support_contact': Math.floor(Math.random() * 2)
          },
          conversionEvents: Math.floor(Math.random() * 5),
          retentionScore: Math.floor(Math.random() * 40) + 60,
          engagementScore: Math.floor(Math.random() * 30) + 70
        },
        trends: {
          sessionTrend: Math.random() > 0.5 ? 'INCREASING' : 'DECREASING',
          usageTrend: Math.random() > 0.5 ? 'INCREASING' : 'STABLE',
          riskTrend: Math.random() > 0.8 ? 'INCREASING' : 'STABLE'
        }
      });
    }

    return metrics.reverse(); // Most recent first
  }

  /**
   * Get admin audit logs
   */
  async getAdminAuditLogs(
    filters?: {
      adminId?: string;
      category?: string;
      targetType?: string;
      dateRange?: { start: Date; end: Date };
      limit?: number;
      offset?: number;
    }
  ): Promise<{ logs: AuditLog[]; total: number }> {
    // Mock audit logs
    const mockLogs: AuditLog[] = [
      {
        id: 'audit-1',
        adminId: 'admin-1',
        adminName: 'John Admin',
        action: 'USER_STATUS_CHANGED',
        category: 'USER_MANAGEMENT',
        targetType: 'USER',
        targetId: 'user-123',
        changes: [
          {
            field: 'status',
            previousValue: 'ACTIVE',
            newValue: 'SUSPENDED'
          }
        ],
        reason: 'Policy violation - multiple failed payments',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        impact: 'MEDIUM'
      },
      {
        id: 'audit-2',
        adminId: 'admin-2',
        adminName: 'Jane Security',
        action: 'CONTENT_FLAGGED',
        category: 'CONTENT_MODERATION',
        targetType: 'CONTENT',
        targetId: 'content-456',
        changes: [
          {
            field: 'status',
            previousValue: 'PUBLISHED',
            newValue: 'FLAGGED'
          },
          {
            field: 'flagReason',
            previousValue: null,
            newValue: 'Inappropriate content'
          }
        ],
        ipAddress: '192.168.1.51',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        impact: 'LOW'
      },
      {
        id: 'audit-3',
        adminId: 'admin-1',
        adminName: 'John Admin',
        action: 'COMMISSION_RATE_UPDATED',
        category: 'FINANCIAL',
        targetType: 'SYSTEM',
        targetId: 'commission-rate-1',
        changes: [
          {
            field: 'baseRate',
            previousValue: 15.0,
            newValue: 14.5
          }
        ],
        reason: 'Market adjustment for Q4',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        impact: 'HIGH'
      }
    ];

    // Apply filters
    let filteredLogs = mockLogs;
    
    if (filters?.adminId) {
      filteredLogs = filteredLogs.filter(log => log.adminId === filters.adminId);
    }
    
    if (filters?.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filters.category);
    }
    
    if (filters?.targetType) {
      filteredLogs = filteredLogs.filter(log => log.targetType === filters.targetType);
    }

    const total = filteredLogs.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    const logs = filteredLogs.slice(offset, offset + limit);

    return { logs, total };
  }

  /**
   * Create activity pattern for detection
   */
  async createActivityPattern(
    patternData: {
      name: string;
      description: string;
      type: ActivityPattern['type'];
      severity: ActivityPattern['severity'];
      conditions: PatternCondition[];
      actions: PatternAction[];
    },
    createdBy: string
  ): Promise<ActivityPattern> {
    const pattern: ActivityPattern = {
      id: `pattern-${Date.now()}`,
      name: patternData.name,
      description: patternData.description,
      type: patternData.type,
      severity: patternData.severity,
      conditions: patternData.conditions,
      actions: patternData.actions,
      isActive: true,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // In real implementation, save to database
    // await prisma.activityPattern.create({ data: pattern });

    return pattern;
  }

  /**
   * Resolve suspicious activity alert
   */
  async resolveSuspiciousActivity(
    alertId: string,
    resolution: 'RESOLVED' | 'FALSE_POSITIVE',
    notes: string,
    resolvedBy: string
  ): Promise<void> {
    // In real implementation, update database
    console.log(`Alert ${alertId} resolved as ${resolution} by ${resolvedBy}: ${notes}`);

    // Log the resolution
    await this.logAdminAction({
      adminId: resolvedBy,
      adminName: 'Admin User', // Would be fetched from user data
      action: 'SUSPICIOUS_ACTIVITY_RESOLVED',
      category: 'SECURITY',
      targetType: 'USER',
      targetId: alertId,
      changes: [
        {
          field: 'status',
          previousValue: 'OPEN',
          newValue: resolution
        }
      ],
      reason: notes,
      ipAddress: '0.0.0.0',
      userAgent: 'Platform Admin',
      timestamp: new Date(),
      impact: 'MEDIUM'
    });
  }

  /**
   * Log admin action for audit trail
   */
  async logAdminAction(auditData: Omit<AuditLog, 'id'>): Promise<AuditLog> {
    const auditLog: AuditLog = {
      ...auditData,
      id: `audit-${Date.now()}`
    };

    // In real implementation, save to database
    // await prisma.auditLog.create({ data: auditLog });

    console.log('Admin action logged:', auditLog);
    return auditLog;
  }

  /**
   * Private helper methods
   */
  private async checkSuspiciousPatterns(activity: UserActivity): Promise<void> {
    // Mock pattern checking
    if (activity.riskScore > this.RISK_SCORE_THRESHOLD) {
      console.log(`High risk activity detected for user ${activity.userId}: ${activity.action}`);
      
      if (activity.riskScore > this.ALERT_THRESHOLD) {
        // Create alert
        console.log(`Creating suspicious activity alert for user ${activity.userId}`);
      }
    }
  }

  private async updateBehaviorAnalytics(userId: string, activity: UserActivity): Promise<void> {
    // Mock behavior analytics update
    console.log(`Updating behavior analytics for user ${userId} with activity ${activity.action}`);
  }
}

export const userActivityMonitoringService = new UserActivityMonitoringService();