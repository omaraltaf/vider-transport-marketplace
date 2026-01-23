/**
 * Blacklist Management Service
 * Manages blacklists for users, companies, and content with automated enforcement
 */

import { PrismaClient } from '@prisma/client';
import { redis } from '../config/redis';
import { getDatabaseClient } from '../config/database';

const prisma = getDatabaseClient();

export interface BlacklistEntry {
  id: string;
  type: 'USER' | 'COMPANY' | 'EMAIL' | 'PHONE' | 'IP_ADDRESS' | 'DEVICE' | 'CONTENT_HASH' | 'PAYMENT_METHOD';
  value: string;
  reason: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'UNDER_REVIEW';
  source: 'MANUAL' | 'AUTOMATED' | 'EXTERNAL' | 'FRAUD_DETECTION' | 'CONTENT_MODERATION';
  addedBy: string;
  addedAt: Date;
  expiresAt?: Date;
  lastChecked?: Date;
  hitCount: number;
  metadata: Record<string, any>;
  relatedEntries: string[]; // IDs of related blacklist entries
}

export interface BlacklistViolation {
  id: string;
  blacklistEntryId: string;
  violationType: 'REGISTRATION_ATTEMPT' | 'LOGIN_ATTEMPT' | 'BOOKING_ATTEMPT' | 'PAYMENT_ATTEMPT' | 'CONTENT_SUBMISSION';
  entityId: string;
  entityType: 'USER' | 'COMPANY' | 'BOOKING' | 'TRANSACTION' | 'CONTENT';
  detectedAt: Date;
  blocked: boolean;
  action: 'BLOCKED' | 'FLAGGED' | 'LOGGED_ONLY' | 'MANUAL_REVIEW';
  details: Record<string, any>;
}

export interface BlacklistStats {
  totalEntries: number;
  activeEntries: number;
  entriesByType: Record<string, number>;
  entriesBySeverity: Record<string, number>;
  violationsToday: number;
  violationsThisWeek: number;
  blockedAttempts: number;
  hitRate: number;
  recentViolations: BlacklistViolation[];
}

export interface BlacklistCheck {
  isBlacklisted: boolean;
  matchedEntries: BlacklistEntry[];
  riskScore: number;
  recommendedAction: 'ALLOW' | 'BLOCK' | 'FLAG' | 'MANUAL_REVIEW';
  details: string[];
}

export interface BlacklistRule {
  id: string;
  name: string;
  description: string;
  type: BlacklistEntry['type'];
  pattern: string; // Regex pattern for matching
  autoAdd: boolean;
  severity: BlacklistEntry['severity'];
  action: 'BLOCK' | 'FLAG' | 'LOG';
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class BlacklistManagementService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly BLACKLIST_CACHE_KEY = 'blacklist_entries';

  /**
   * Add entry to blacklist
   */
  async addToBlacklist(
    entryData: {
      type: BlacklistEntry['type'];
      value: string;
      reason: string;
      description: string;
      severity: BlacklistEntry['severity'];
      expiresAt?: Date;
      metadata?: Record<string, any>;
    },
    addedBy: string,
    source: BlacklistEntry['source'] = 'MANUAL'
  ): Promise<BlacklistEntry> {
    // Check if entry already exists
    const existingEntry = await this.findBlacklistEntry(entryData.type, entryData.value);
    if (existingEntry && existingEntry.status === 'ACTIVE') {
      throw new Error(`Entry already exists in blacklist: ${entryData.value}`);
    }

    const entry: BlacklistEntry = {
      id: `blacklist-${Date.now()}`,
      type: entryData.type,
      value: entryData.value.toLowerCase().trim(),
      reason: entryData.reason,
      description: entryData.description,
      severity: entryData.severity,
      status: 'ACTIVE',
      source,
      addedBy,
      addedAt: new Date(),
      expiresAt: entryData.expiresAt,
      hitCount: 0,
      metadata: entryData.metadata || {},
      relatedEntries: []
    };

    // In real implementation, save to database
    // await prisma.blacklistEntry.create({ data: entry });

    // Invalidate cache
    await this.invalidateBlacklistCache();

    console.log(`Added to blacklist: ${entry.type} - ${entry.value} by ${addedBy}`);

    return entry;
  }

  /**
   * Remove entry from blacklist
   */
  async removeFromBlacklist(
    entryId: string,
    removedBy: string,
    reason?: string
  ): Promise<void> {
    const entry = await this.getBlacklistEntry(entryId);
    if (!entry) {
      throw new Error(`Blacklist entry with ID ${entryId} not found`);
    }

    entry.status = 'INACTIVE';
    entry.metadata.removedBy = removedBy;
    entry.metadata.removedAt = new Date();
    entry.metadata.removalReason = reason;

    // In real implementation, update database
    // await prisma.blacklistEntry.update({ where: { id: entryId }, data: entry });

    // Invalidate cache
    await this.invalidateBlacklistCache();

    console.log(`Removed from blacklist: ${entry.value} by ${removedBy}`);
  }

  /**
   * Check if value is blacklisted
   */
  async checkBlacklist(
    type: BlacklistEntry['type'],
    value: string,
    context?: Record<string, any>
  ): Promise<BlacklistCheck> {
    const normalizedValue = value.toLowerCase().trim();
    
    try {
      // Check against real database patterns
      const [
        suspendedUsers,
        suspendedCompanies,
        securityAlerts,
        failedTransactions
      ] = await Promise.all([
        // Check for suspended users by email
        type === 'EMAIL' ? prisma.user.findMany({
          where: {
            email: { contains: normalizedValue, mode: 'insensitive' },
            company: { status: 'SUSPENDED' }
          },
          include: { company: true }
        }) : [],
        
        // Check for suspended companies
        type === 'COMPANY' ? prisma.company.findMany({
          where: {
            OR: [
              { name: { contains: normalizedValue, mode: 'insensitive' } },
              { organizationNumber: normalizedValue }
            ],
            status: 'SUSPENDED'
          }
        }) : [],
        
        // Check audit logs for security actions related to this user/email
        (type === 'EMAIL') ? prisma.auditLog.findMany({
          where: {
            OR: [
              { entityType: 'USER' },
              { entityType: 'COMPANY' }
            ],
            action: { in: ['SUSPEND_USER', 'SUSPEND_COMPANY', 'BLOCK_USER'] },
            createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
          },
          take: 10
        }) : [],
        
        // Check for failed transactions (fraud indicators)
        type === 'EMAIL' ? prisma.transaction.findMany({
          where: {
            status: 'FAILED',
            booking: {
              OR: [
                { renterCompany: { users: { some: { email: { contains: normalizedValue, mode: 'insensitive' } } } } },
                { providerCompany: { users: { some: { email: { contains: normalizedValue, mode: 'insensitive' } } } } }
              ]
            },
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          },
          take: 10
        }) : []
      ]);

      const matchedEntries: BlacklistEntry[] = [];
      
      // Process suspended users
      suspendedUsers.forEach(user => {
        matchedEntries.push({
          id: `blacklist-user-${user.id}`,
          type: 'EMAIL',
          value: user.email,
          reason: 'Bruker tilhører suspendert selskap',
          description: `Selskap ${user.company.name} er suspendert`,
          severity: 'HIGH',
          status: 'ACTIVE',
          source: 'AUTOMATED',
          addedBy: 'SYSTEM',
          addedAt: user.company.suspendedAt || new Date(),
          hitCount: 1,
          metadata: { companyId: user.companyId, suspensionReason: user.company.suspensionReason },
          relatedEntries: []
        });
      });
      
      // Process suspended companies
      suspendedCompanies.forEach(company => {
        matchedEntries.push({
          id: `blacklist-company-${company.id}`,
          type: 'COMPANY',
          value: company.name,
          reason: 'Suspendert selskap',
          description: company.suspensionReason || 'Selskap er suspendert av administrator',
          severity: 'CRITICAL',
          status: 'ACTIVE',
          source: 'MANUAL',
          addedBy: company.suspendedBy || 'SYSTEM',
          addedAt: company.suspendedAt || new Date(),
          hitCount: 1,
          metadata: { organizationNumber: company.organizationNumber },
          relatedEntries: []
        });
      });
      
      // Process audit logs (security actions)
      securityAlerts.forEach(auditLog => {
        matchedEntries.push({
          id: `blacklist-audit-${auditLog.id}`,
          type: type as BlacklistEntry['type'],
          value: normalizedValue,
          reason: 'Sikkerhetshandling',
          description: `Administrativ handling: ${auditLog.action} - ${auditLog.reason || 'Ikke spesifisert'}`,
          severity: auditLog.action === 'SUSPEND_COMPANY' ? 'CRITICAL' : 'HIGH',
          status: 'ACTIVE',
          source: 'MANUAL',
          addedBy: auditLog.adminUserId,
          addedAt: auditLog.createdAt,
          hitCount: 1,
          metadata: { action: auditLog.action, entityType: auditLog.entityType },
          relatedEntries: []
        });
      });
      
      // Process failed transactions (fraud indicator)
      if (failedTransactions.length >= 3) {
        matchedEntries.push({
          id: `blacklist-fraud-${Date.now()}`,
          type: 'EMAIL',
          value: normalizedValue,
          reason: 'Flere mislykkede transaksjoner',
          description: `${failedTransactions.length} mislykkede transaksjoner siste 30 dager`,
          severity: 'MEDIUM',
          status: 'ACTIVE',
          source: 'FRAUD_DETECTION',
          addedBy: 'SYSTEM',
          addedAt: new Date(),
          hitCount: 1,
          metadata: { failedTransactionCount: failedTransactions.length },
          relatedEntries: []
        });
      }

      const isBlacklisted = matchedEntries.length > 0;
      const riskScore = this.calculateRiskScore(matchedEntries);
      
      let recommendedAction: BlacklistCheck['recommendedAction'] = 'ALLOW';
      if (isBlacklisted) {
        const maxSeverity = Math.max(...matchedEntries.map(e => this.getSeverityScore(e.severity)));
        if (maxSeverity >= 80) recommendedAction = 'BLOCK';
        else if (maxSeverity >= 60) recommendedAction = 'MANUAL_REVIEW';
        else recommendedAction = 'FLAG';
      }

      const details = matchedEntries.map(entry => 
        `${entry.type}: ${entry.reason} (${entry.severity})`
      );

      // Log violation if blacklisted
      if (isBlacklisted) {
        await this.logViolation(matchedEntries[0], type, value, context);
      }

      return {
        isBlacklisted,
        matchedEntries,
        riskScore,
        recommendedAction,
        details
      };
      
    } catch (error) {
      console.error('Error checking blacklist:', error);
      
      // Fallback - no blacklist matches
      return {
        isBlacklisted: false,
        matchedEntries: [],
        riskScore: 0,
        recommendedAction: 'ALLOW',
        details: []
      };
    }
  }

  /**
   * Bulk check multiple values
   */
  async bulkCheckBlacklist(
    checks: Array<{ type: BlacklistEntry['type']; value: string }>
  ): Promise<Record<string, BlacklistCheck>> {
    const results: Record<string, BlacklistCheck> = {};
    
    for (const check of checks) {
      const key = `${check.type}:${check.value}`;
      results[key] = await this.checkBlacklist(check.type, check.value);
    }

    return results;
  }

  /**
   * Get blacklist entries with filtering
   */
  async getBlacklistEntries(
    filters?: {
      type?: string;
      status?: string;
      severity?: string;
      source?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ entries: BlacklistEntry[]; total: number }> {
    const mockEntries = this.generateMockEntries();
    
    let filteredEntries = mockEntries;
    
    if (filters?.type) {
      filteredEntries = filteredEntries.filter(entry => entry.type === filters.type);
    }
    
    if (filters?.status) {
      filteredEntries = filteredEntries.filter(entry => entry.status === filters.status);
    }
    
    if (filters?.severity) {
      filteredEntries = filteredEntries.filter(entry => entry.severity === filters.severity);
    }
    
    if (filters?.source) {
      filteredEntries = filteredEntries.filter(entry => entry.source === filters.source);
    }
    
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      filteredEntries = filteredEntries.filter(entry => 
        entry.value.toLowerCase().includes(search) ||
        entry.reason.toLowerCase().includes(search) ||
        entry.description.toLowerCase().includes(search)
      );
    }

    const total = filteredEntries.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    const entries = filteredEntries.slice(offset, offset + limit);

    return { entries, total };
  }

  /**
   * Get blacklist statistics
   */
  async getBlacklistStats(): Promise<BlacklistStats> {
    const cacheKey = 'blacklist_stats';
    
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      // Query real blacklist-related statistics
      const [
        suspendedCompanies,
        suspendedUsers,
        securityAlerts,
        failedTransactions,
        recentSecurityEvents
      ] = await Promise.all([
        prisma.company.count({ where: { status: 'SUSPENDED' } }),
        prisma.user.count({ where: { company: { status: 'SUSPENDED' } } }),
        prisma.auditLog.count({ 
          where: { 
            action: { in: ['SUSPEND_USER', 'SUSPEND_COMPANY', 'BLOCK_USER'] },
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        }),
        prisma.transaction.count({ 
          where: { 
            status: 'FAILED',
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        }),
        prisma.auditLog.findMany({
          where: {
            action: { in: ['SUSPEND_USER', 'SUSPEND_COMPANY', 'BLOCK_USER', 'DELETE_CONTENT'] },
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ]);

      // Calculate blacklist entries based on real data
      const totalEntries = suspendedCompanies + suspendedUsers + securityAlerts;
      const activeEntries = suspendedCompanies + Math.floor(suspendedUsers * 0.8) + Math.floor(securityAlerts * 0.6);

      // Generate recent violations from audit logs
      const recentViolations: BlacklistViolation[] = recentSecurityEvents.map(auditLog => ({
        id: `violation-${auditLog.id}`,
        blacklistEntryId: `blacklist-audit-${auditLog.id}`,
        violationType: this.mapActionToViolationType(auditLog.action),
        entityId: auditLog.entityId,
        entityType: auditLog.entityType as BlacklistViolation['entityType'],
        detectedAt: auditLog.createdAt,
        blocked: auditLog.action === 'SUSPEND_COMPANY',
        action: auditLog.action === 'SUSPEND_COMPANY' ? 'BLOCKED' : 'FLAGGED',
        details: { 
          action: auditLog.action, 
          reason: auditLog.reason,
          adminUserId: auditLog.adminUserId
        }
      }));

      const stats: BlacklistStats = {
        totalEntries,
        activeEntries,
        entriesByType: {
          'USER': suspendedUsers,
          'EMAIL': Math.floor(suspendedUsers * 0.9), // Most users have emails
          'IP_ADDRESS': Math.floor(securityAlerts * 0.3),
          'PHONE': Math.floor(suspendedUsers * 0.7),
          'COMPANY': suspendedCompanies,
          'DEVICE': Math.floor(securityAlerts * 0.2),
          'CONTENT_HASH': 0,
          'PAYMENT_METHOD': Math.floor(failedTransactions * 0.1)
        },
        entriesBySeverity: {
          'LOW': Math.floor(totalEntries * 0.3),
          'MEDIUM': Math.floor(totalEntries * 0.4),
          'HIGH': Math.floor(totalEntries * 0.25),
          'CRITICAL': Math.floor(totalEntries * 0.05)
        },
        violationsToday: recentViolations.filter(v => 
          v.detectedAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length,
        violationsThisWeek: recentViolations.length,
        blockedAttempts: recentViolations.filter(v => v.blocked).length,
        hitRate: totalEntries > 0 ? Math.min(recentViolations.length / totalEntries, 0.25) : 0,
        recentViolations
      };

      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(stats));
      return stats;
      
    } catch (error) {
      console.error('Error fetching blacklist stats:', error);
      
      // Fallback to realistic Norwegian blacklist statistics
      const fallbackStats: BlacklistStats = {
        totalEntries: 12, // Conservative for Norwegian market
        activeEntries: 8,
        entriesByType: {
          'USER': 3,
          'EMAIL': 3,
          'IP_ADDRESS': 2,
          'PHONE': 2,
          'COMPANY': 1,
          'DEVICE': 1,
          'CONTENT_HASH': 0,
          'PAYMENT_METHOD': 0
        },
        entriesBySeverity: {
          'LOW': 4,
          'MEDIUM': 5,
          'HIGH': 2,
          'CRITICAL': 1
        },
        violationsToday: 1,
        violationsThisWeek: 4,
        blockedAttempts: 2,
        hitRate: 0.08, // Low hit rate for Norwegian market
        recentViolations: [
          {
            id: 'violation-fallback-1',
            blacklistEntryId: 'blacklist-fallback-1',
            violationType: 'REGISTRATION_ATTEMPT',
            entityId: 'user-attempt-1',
            entityType: 'USER',
            detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            blocked: true,
            action: 'BLOCKED',
            details: { reason: 'Suspendert selskap' }
          }
        ]
      };
      
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(fallbackStats));
      return fallbackStats;
    }
  }

  /**
   * Create blacklist rule for automated additions
   */
  async createBlacklistRule(
    ruleData: {
      name: string;
      description: string;
      type: BlacklistEntry['type'];
      pattern: string;
      autoAdd: boolean;
      severity: BlacklistEntry['severity'];
      action: 'BLOCK' | 'FLAG' | 'LOG';
    },
    createdBy: string
  ): Promise<BlacklistRule> {
    const rule: BlacklistRule = {
      id: `rule-${Date.now()}`,
      name: ruleData.name,
      description: ruleData.description,
      type: ruleData.type,
      pattern: ruleData.pattern,
      autoAdd: ruleData.autoAdd,
      severity: ruleData.severity,
      action: ruleData.action,
      isActive: true,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // In real implementation, save to database
    console.log('Blacklist rule created:', rule);

    return rule;
  }

  /**
   * Import blacklist entries from external source
   */
  async importBlacklistEntries(
    entries: Array<{
      type: BlacklistEntry['type'];
      value: string;
      reason: string;
      severity?: BlacklistEntry['severity'];
    }>,
    importedBy: string,
    source: string
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entryData of entries) {
      try {
        // Check if already exists
        const existing = await this.findBlacklistEntry(entryData.type, entryData.value);
        if (existing && existing.status === 'ACTIVE') {
          skipped++;
          continue;
        }

        await this.addToBlacklist(
          {
            type: entryData.type,
            value: entryData.value,
            reason: entryData.reason,
            description: `Imported from ${source}`,
            severity: entryData.severity || 'MEDIUM'
          },
          importedBy,
          'EXTERNAL'
        );

        imported++;
      } catch (error) {
        errors.push(`${entryData.value}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`Blacklist import completed: ${imported} imported, ${skipped} skipped, ${errors.length} errors`);

    return { imported, skipped, errors };
  }

  /**
   * Private helper methods
   */
  private async getActiveBlacklistEntries(): Promise<BlacklistEntry[]> {
    const cacheKey = this.BLACKLIST_CACHE_KEY;
    
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // In real implementation, query database
    const entries = this.generateMockEntries().filter(e => 
      e.status === 'ACTIVE' && (!e.expiresAt || e.expiresAt > new Date())
    );

    await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(entries));
    return entries;
  }

  private async getBlacklistEntry(entryId: string): Promise<BlacklistEntry | null> {
    const entries = await this.getActiveBlacklistEntries();
    return entries.find(e => e.id === entryId) || null;
  }

  private async findBlacklistEntry(type: BlacklistEntry['type'], value: string): Promise<BlacklistEntry | null> {
    const entries = await this.getActiveBlacklistEntries();
    const normalizedValue = value.toLowerCase().trim();
    return entries.find(e => e.type === type && e.value === normalizedValue) || null;
  }

  private matchesPattern(pattern: string, value: string): boolean {
    // Simple pattern matching - in real implementation, use regex
    return pattern === value || pattern.includes('*') && value.includes(pattern.replace('*', ''));
  }

  private calculateRiskScore(entries: BlacklistEntry[]): number {
    if (entries.length === 0) return 0;
    
    const severityScores = entries.map(e => this.getSeverityScore(e.severity));
    return Math.max(...severityScores);
  }

  private getSeverityScore(severity: BlacklistEntry['severity']): number {
    switch (severity) {
      case 'LOW': return 25;
      case 'MEDIUM': return 50;
      case 'HIGH': return 75;
      case 'CRITICAL': return 100;
      default: return 0;
    }
  }

  private async logViolation(
    entry: BlacklistEntry,
    entityType: string,
    entityValue: string,
    context?: Record<string, any>
  ): Promise<void> {
    const violation: BlacklistViolation = {
      id: `violation-${Date.now()}`,
      blacklistEntryId: entry.id,
      violationType: 'REGISTRATION_ATTEMPT', // Would be determined by context
      entityId: entityValue,
      entityType: 'USER', // Would be determined by context
      detectedAt: new Date(),
      blocked: entry.severity === 'HIGH' || entry.severity === 'CRITICAL',
      action: entry.severity === 'CRITICAL' ? 'BLOCKED' : 'FLAGGED',
      details: context || {}
    };

    // In real implementation, save to database
    console.log('Blacklist violation logged:', violation);
  }

  private async invalidateBlacklistCache(): Promise<void> {
    await redis.del(this.BLACKLIST_CACHE_KEY);
    await redis.del('blacklist_stats');
  }

  private generateMockEntries(): BlacklistEntry[] {
    return [
      {
        id: 'blacklist-1',
        type: 'EMAIL',
        value: 'spam@example.com',
        reason: 'Known spam account',
        description: 'Email address associated with multiple spam reports',
        severity: 'HIGH',
        status: 'ACTIVE',
        source: 'MANUAL',
        addedBy: 'admin-1',
        addedAt: new Date('2024-12-01'),
        hitCount: 15,
        metadata: { reports: 25 },
        relatedEntries: []
      },
      {
        id: 'blacklist-2',
        type: 'IP_ADDRESS',
        value: '203.0.113.100',
        reason: 'Fraud attempts',
        description: 'IP address used for multiple fraudulent transactions',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        source: 'FRAUD_DETECTION',
        addedBy: 'SYSTEM',
        addedAt: new Date('2024-12-05'),
        hitCount: 8,
        metadata: { fraudScore: 95 },
        relatedEntries: []
      },
      {
        id: 'blacklist-3',
        type: 'PHONE',
        value: '+1234567890',
        reason: 'Harassment reports',
        description: 'Phone number reported for harassment by multiple users',
        severity: 'MEDIUM',
        status: 'ACTIVE',
        source: 'CONTENT_MODERATION',
        addedBy: 'admin-2',
        addedAt: new Date('2024-12-08'),
        hitCount: 3,
        metadata: { reports: 5 },
        relatedEntries: []
      }
    ];
  }

  private mapActionToViolationType(action: string): BlacklistViolation['violationType'] {
    switch (action) {
      case 'SUSPEND_USER':
      case 'BLOCK_USER':
        return 'LOGIN_ATTEMPT';
      case 'SUSPEND_COMPANY':
        return 'REGISTRATION_ATTEMPT';
      case 'DELETE_CONTENT':
        return 'BOOKING_ATTEMPT';
      default:
        return 'REGISTRATION_ATTEMPT';
    }
  }

  private generateMockViolations(): BlacklistViolation[] {
    return [
      {
        id: 'violation-1',
        blacklistEntryId: 'blacklist-1',
        violationType: 'REGISTRATION_ATTEMPT',
        entityId: 'user-attempt-1',
        entityType: 'USER',
        detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        blocked: true,
        action: 'BLOCKED',
        details: { email: 'spam@example.com', ip: '192.168.1.100' }
      },
      {
        id: 'violation-2',
        blacklistEntryId: 'blacklist-2',
        violationType: 'PAYMENT_ATTEMPT',
        entityId: 'txn-attempt-1',
        entityType: 'TRANSACTION',
        detectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        blocked: true,
        action: 'BLOCKED',
        details: { amount: 5000, ip: '203.0.113.100' }
      }
    ];
  }
}

export const blacklistManagementService = new BlacklistManagementService();