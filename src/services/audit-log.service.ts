import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export enum AuditAction {
  // User Management Actions
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DELETED = 'USER_DELETED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_PASSWORD_RESET = 'USER_PASSWORD_RESET',
  
  // Company Management Actions
  COMPANY_CREATED = 'COMPANY_CREATED',
  COMPANY_UPDATED = 'COMPANY_UPDATED',
  COMPANY_VERIFIED = 'COMPANY_VERIFIED',
  COMPANY_SUSPENDED = 'COMPANY_SUSPENDED',
  COMPANY_DELETED = 'COMPANY_DELETED',
  
  // Financial Actions
  COMMISSION_RATE_UPDATED = 'COMMISSION_RATE_UPDATED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  DISPUTE_CREATED = 'DISPUTE_CREATED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
  REVENUE_REPORT_GENERATED = 'REVENUE_REPORT_GENERATED',
  
  // Content Moderation Actions
  CONTENT_FLAGGED = 'CONTENT_FLAGGED',
  CONTENT_APPROVED = 'CONTENT_APPROVED',
  CONTENT_REMOVED = 'CONTENT_REMOVED',
  USER_BLACKLISTED = 'USER_BLACKLISTED',
  FRAUD_ALERT_CREATED = 'FRAUD_ALERT_CREATED',
  
  // System Configuration Actions
  FEATURE_TOGGLE_CHANGED = 'FEATURE_TOGGLE_CHANGED',
  SYSTEM_CONFIG_UPDATED = 'SYSTEM_CONFIG_UPDATED',
  BACKUP_CREATED = 'BACKUP_CREATED',
  BACKUP_RESTORED = 'BACKUP_RESTORED',
  RATE_LIMIT_UPDATED = 'RATE_LIMIT_UPDATED',
  
  // Communication Actions
  ANNOUNCEMENT_CREATED = 'ANNOUNCEMENT_CREATED',
  ANNOUNCEMENT_SENT = 'ANNOUNCEMENT_SENT',
  SUPPORT_TICKET_ASSIGNED = 'SUPPORT_TICKET_ASSIGNED',
  HELP_ARTICLE_PUBLISHED = 'HELP_ARTICLE_PUBLISHED',
  
  // Security Actions
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SECURITY_ALERT = 'SECURITY_ALERT',
  
  // Data Actions
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  BULK_OPERATION = 'BULK_OPERATION',
  
  // Analytics Actions
  REPORT_GENERATED = 'REPORT_GENERATED',
  ANALYTICS_ACCESSED = 'ANALYTICS_ACCESSED'
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AuditLogEntry {
  // Core Prisma fields (matching Prisma schema)
  id: string;
  action: string;
  adminUserId: string;
  entityType: string;
  entityId: string;
  changes: any;
  reason?: string;
  ipAddress?: string;
  createdAt: Date;
  
  // Backward compatibility fields (derived from changes or mapped)
  severity?: AuditSeverity;
  userId?: string;
  userEmail?: string;
  targetId?: string;
  targetType?: string;
  description?: string;
  metadata?: any;
  userAgent?: string;
  sessionId?: string;
  success?: boolean;
  errorMessage?: string;
  duration?: number;
  resourcesAccessed?: string[];
}

export interface AuditLogQuery {
  userId?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  targetType?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  ipAddress?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'severity' | 'action';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditLogSummary {
  totalEntries: number;
  entriesByAction: { [key in AuditAction]?: number };
  entriesBySeverity: { [key in AuditSeverity]: number };
  entriesByUser: { userId: string; userEmail: string; count: number }[];
  successRate: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export class AuditLogService {
  /**
   * Helper method to map Prisma AuditLog to AuditLogEntry interface
   */
  private mapPrismaToAuditLogEntry(auditEntry: any): AuditLogEntry {
    return {
      id: auditEntry.id,
      action: auditEntry.action,
      adminUserId: auditEntry.adminUserId,
      entityType: auditEntry.entityType,
      entityId: auditEntry.entityId,
      changes: auditEntry.changes,
      reason: auditEntry.reason,
      ipAddress: auditEntry.ipAddress,
      createdAt: auditEntry.createdAt,
      // Map additional fields from changes JSON for backward compatibility
      severity: (auditEntry.changes as any)?.severity,
      userId: auditEntry.adminUserId,
      userEmail: (auditEntry.changes as any)?.userEmail,
      targetId: auditEntry.entityId,
      targetType: auditEntry.entityType,
      description: auditEntry.reason,
      metadata: (auditEntry.changes as any)?.metadata || {},
      userAgent: (auditEntry.changes as any)?.userAgent,
      sessionId: (auditEntry.changes as any)?.sessionId,
      success: (auditEntry.changes as any)?.success,
      errorMessage: (auditEntry.changes as any)?.errorMessage,
      duration: (auditEntry.changes as any)?.duration,
      resourcesAccessed: (auditEntry.changes as any)?.resourcesAccessed || []
    };
  }

  /**
   * Log an audit event
   */
  async logEvent(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
    try {
      const auditEntry = await prisma.auditLog.create({
        data: {
          action: entry.action,
          adminUserId: entry.userId || entry.adminUserId || 'system',
          entityType: entry.targetType || entry.entityType || 'unknown',
          entityId: entry.targetId || entry.entityId || 'unknown',
          changes: {
            severity: entry.severity,
            userEmail: entry.userEmail,
            description: entry.description,
            metadata: entry.metadata || {},
            userAgent: entry.userAgent,
            sessionId: entry.sessionId,
            success: entry.success,
            errorMessage: entry.errorMessage,
            duration: entry.duration,
            resourcesAccessed: entry.resourcesAccessed || []
          },
          reason: entry.description || entry.reason,
          ipAddress: entry.ipAddress
        }
      });

      return this.mapPrismaToAuditLogEntry(auditEntry);
    } catch (error) {
      console.error('Failed to log audit event:', error);
      throw new Error('Audit logging failed');
    }
  }

  /**
   * Log a successful admin action
   */
  async logAdminAction(
    action: AuditAction,
    userId: string,
    userEmail: string,
    description: string,
    metadata: any = {},
    options: {
      targetId?: string;
      targetType?: string;
      severity?: AuditSeverity;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      duration?: number;
      companyId?: string;
    } = {}
  ): Promise<AuditLogEntry> {
    return this.logEvent({
      action,
      adminUserId: userId,
      entityType: options.targetType || 'UNKNOWN',
      entityId: options.targetId || 'unknown',
      changes: {
        severity: options.severity || AuditSeverity.MEDIUM,
        userEmail,
        description,
        metadata,
        userAgent: options.userAgent,
        sessionId: options.sessionId,
        success: true,
        duration: options.duration
      },
      reason: description,
      ipAddress: options.ipAddress
    });
  }

  /**
   * Log a failed admin action
   */
  async logFailedAction(
    action: AuditAction,
    userId: string,
    userEmail: string,
    description: string,
    errorMessage: string,
    metadata: any = {},
    options: {
      targetId?: string;
      targetType?: string;
      severity?: AuditSeverity;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      duration?: number;
      companyId?: string;
    } = {}
  ): Promise<AuditLogEntry> {
    return this.logEvent({
      action,
      adminUserId: userId,
      entityType: options.targetType || 'UNKNOWN',
      entityId: options.targetId || 'unknown',
      changes: {
        severity: options.severity || AuditSeverity.HIGH,
        userEmail,
        description,
        metadata,
        userAgent: options.userAgent,
        sessionId: options.sessionId,
        success: false,
        errorMessage,
        duration: options.duration
      },
      reason: description,
      ipAddress: options.ipAddress
    });
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(
    action: AuditAction,
    description: string,
    severity: AuditSeverity = AuditSeverity.HIGH,
    metadata: any = {},
    options: {
      userId?: string;
      userEmail?: string;
      targetId?: string;
      targetType?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      success?: boolean;
      errorMessage?: string;
    } = {}
  ): Promise<AuditLogEntry> {
    return this.logEvent({
      action,
      adminUserId: options.userId || 'system',
      entityType: options.targetType || 'SECURITY',
      entityId: options.targetId || 'security-event',
      changes: {
        severity,
        userEmail: options.userEmail,
        description,
        metadata,
        userAgent: options.userAgent,
        sessionId: options.sessionId,
        success: options.success !== false,
        errorMessage: options.errorMessage
      },
      reason: description,
      ipAddress: options.ipAddress
    });
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(query: AuditLogQuery = {}): Promise<{
    logs: AuditLogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      userId,
      action,
      severity,
      targetType,
      startDate,
      endDate,
      success,
      ipAddress,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    const where: any = {};

    if (userId) where.adminUserId = userId;
    if (action) where.action = action;
    if (severity) where.severity = severity;
    if (targetType) where.entityType = targetType;
    if (success !== undefined) {
      // Note: success is stored in changes JSON, not as a direct field
      where.changes = { path: ['success'], equals: success };
    }
    if (ipAddress) where.ipAddress = ipAddress;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs: logs as AuditLogEntry[],
      total,
      hasMore: offset + logs.length < total
    };
  }

  /**
   * Get audit log summary and statistics
   */
  async getAuditLogSummary(
    startDate?: Date,
    endDate?: Date,
    companyId?: string
  ): Promise<AuditLogSummary> {
    const where: any = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      totalEntries,
      actionCounts,
      severityCounts,
      userCounts,
      successCount,
      timeRange
    ] = await Promise.all([
      // Total entries
      prisma.auditLog.count({ where }),
      
      // Entries by action
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true }
      }),
      
      // Entries by severity
      prisma.auditLog.groupBy({
        by: ['severity'],
        where,
        _count: { severity: true }
      }),
      
      // Entries by user (top 10)
      prisma.auditLog.groupBy({
        by: ['adminUserId'],
        where: { ...where, adminUserId: { not: null } },
        _count: { adminUserId: true },
        orderBy: { _count: { adminUserId: 'desc' } },
        take: 10
      }),
      
      // Success count
      prisma.auditLog.count({ where: { ...where, success: true } }),
      
      // Time range
      prisma.auditLog.aggregate({
        where,
        _min: { createdAt: true },
        _max: { createdAt: true }
      })
    ]);

    // Process action counts
    const entriesByAction: { [key in AuditAction]?: number } = {};
    actionCounts.forEach(item => {
      entriesByAction[item.action as AuditAction] = item._count.action;
    });

    // Process severity counts
    const entriesBySeverity: { [key in AuditSeverity]: number } = {
      [AuditSeverity.LOW]: 0,
      [AuditSeverity.MEDIUM]: 0,
      [AuditSeverity.HIGH]: 0,
      [AuditSeverity.CRITICAL]: 0
    };
    severityCounts.forEach(item => {
      entriesBySeverity[item.severity as AuditSeverity] = item._count.severity;
    });

    // Process user counts
    const entriesByUser = userCounts.map(item => ({
      userId: item.userId!,
      userEmail: item.userEmail || 'Unknown',
      count: item._count.userId
    }));

    return {
      totalEntries,
      entriesByAction,
      entriesBySeverity,
      entriesByUser,
      successRate: totalEntries > 0 ? (successCount / totalEntries) * 100 : 0,
      timeRange: {
        start: timeRange._min.createdAt || new Date(),
        end: timeRange._max.createdAt || new Date()
      }
    };
  }

  /**
   * Get audit trail for a specific resource
   */
  async getResourceAuditTrail(
    targetType: string,
    targetId: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: targetType,
        entityId: targetId
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return logs.map(this.mapPrismaToAuditLogEntry.bind(this));
  }

  /**
   * Get user activity audit trail
   */
  async getUserAuditTrail(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    const where: any = { adminUserId: userId };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return logs.map(this.mapPrismaToAuditLogEntry.bind(this));
  }

  /**
   * Export audit logs to CSV format
   */
  async exportAuditLogs(query: AuditLogQuery = {}): Promise<string> {
    const { logs } = await this.getAuditLogs({ ...query, limit: 10000 });
    
    const headers = [
      'Created At',
      'Action',
      'Severity',
      'User Email',
      'Target Type',
      'Target ID',
      'Description',
      'Success',
      'IP Address',
      'Error Message'
    ];

    const csvRows = [
      headers.join(','),
      ...logs.map(log => [
        log.createdAt.toISOString(),
        log.action,
        log.severity,
        log.userEmail || '',
        log.targetType || '',
        log.targetId || '',
        `"${log.description.replace(/"/g, '""')}"`,
        log.success.toString(),
        log.ipAddress || '',
        log.errorMessage ? `"${log.errorMessage.replace(/"/g, '""')}"` : ''
      ].join(','))
    ];

    return csvRows.join('\n');
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  }

  /**
   * Get audit log statistics for dashboard
   */
  async getDashboardStats(days: number = 30): Promise<{
    totalEvents: number;
    securityEvents: number;
    failedActions: number;
    uniqueUsers: number;
    topActions: { action: string; count: number }[];
    dailyActivity: { date: string; count: number }[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalEvents,
      securityEvents,
      failedActions,
      uniqueUsers,
      topActions,
      dailyActivity
    ] = await Promise.all([
      // Total events
      prisma.auditLog.count({
        where: { createdAt: { gte: startDate } }
      }),
      
      // Security events
      prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate },
          action: {
            in: [
              AuditAction.LOGIN_FAILED,
              AuditAction.PERMISSION_DENIED,
              AuditAction.SUSPICIOUS_ACTIVITY,
              AuditAction.SECURITY_ALERT
            ]
          }
        }
      }),
      
      // Failed actions (stored in changes JSON)
      prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate },
          changes: { path: ['success'], equals: false }
        }
      }),
      
      // Unique users
      prisma.auditLog.findMany({
        where: {
          createdAt: { gte: startDate },
          adminUserId: { not: null }
        },
        select: { adminUserId: true },
        distinct: ['adminUserId']
      }),
      
      // Top actions
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: startDate } },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 5
      }),
      
      // Daily activity (simplified - would need raw SQL for proper date grouping)
      prisma.auditLog.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true }
      })
    ]);

    // Process daily activity
    const dailyActivityMap = new Map<string, number>();
    dailyActivity.forEach(log => {
      const date = log.createdAt.toISOString().split('T')[0];
      dailyActivityMap.set(date, (dailyActivityMap.get(date) || 0) + 1);
    });

    const dailyActivityArray = Array.from(dailyActivityMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalEvents,
      securityEvents,
      failedActions,
      uniqueUsers: uniqueUsers.length,
      topActions: topActions.map(item => ({
        action: item.action,
        count: item._count.action
      })),
      dailyActivity: dailyActivityArray
    };
  }
}

export const auditLogService = new AuditLogService();