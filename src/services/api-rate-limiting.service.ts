import { PrismaClient } from '@prisma/client';
import { redis } from '../config/redis';

const prisma = new PrismaClient();

export interface RateLimitRule {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | '*';
  limit: number;
  windowMs: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyGenerator: 'ip' | 'user' | 'api_key' | 'custom';
  customKeyFunction?: string;
  enabled: boolean;
  priority: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessControlRule {
  id: string;
  name: string;
  description: string;
  type: 'whitelist' | 'blacklist';
  target: 'ip' | 'user' | 'api_key' | 'user_agent' | 'country';
  values: string[];
  endpoints: string[];
  methods: string[];
  enabled: boolean;
  expiresAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiUsageMetrics {
  endpoint: string;
  method: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  rateLimitHits: number;
  uniqueUsers: number;
  topUsers: Array<{
    userId: string;
    requests: number;
    lastRequest: Date;
  }>;
  hourlyBreakdown: Array<{
    hour: string;
    requests: number;
    errors: number;
  }>;
  statusCodeBreakdown: Record<string, number>;
}

export interface RateLimitViolation {
  id: string;
  ruleId: string;
  ruleName: string;
  key: string;
  endpoint: string;
  method: string;
  limit: number;
  attempts: number;
  windowStart: Date;
  windowEnd: Date;
  userAgent?: string;
  ipAddress: string;
  userId?: string;
  blocked: boolean;
  timestamp: Date;
}

export class ApiRateLimitingService {
  private static instance: ApiRateLimitingService;
  private rateLimitRules = new Map<string, RateLimitRule>();
  private accessControlRules = new Map<string, AccessControlRule>();
  private violations: RateLimitViolation[] = [];

  public static getInstance(): ApiRateLimitingService {
    if (!ApiRateLimitingService.instance) {
      ApiRateLimitingService.instance = new ApiRateLimitingService();
    }
    return ApiRateLimitingService.instance;
  }

  // Rate Limit Rule Management
  async createRateLimitRule(
    rule: Omit<RateLimitRule, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<RateLimitRule> {
    try {
      const ruleId = `rate_limit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newRule: RateLimitRule = {
        ...rule,
        id: ruleId,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.rateLimitRules.set(ruleId, newRule);

      // Cache rule in Redis for fast lookup
      await redis.hset('rate_limit_rules', ruleId, JSON.stringify(newRule));

      await this.logRateLimitEvent(ruleId, 'created', `Rate limit rule created: ${rule.name}`);
      
      return newRule;
    } catch (error) {
      console.error('Error creating rate limit rule:', error);
      throw new Error('Failed to create rate limit rule');
    }
  }

  async getRateLimitRules(enabled?: boolean): Promise<RateLimitRule[]> {
    try {
      let rules = Array.from(this.rateLimitRules.values());

      if (enabled !== undefined) {
        rules = rules.filter(rule => rule.enabled === enabled);
      }

      return rules.sort((a, b) => a.priority - b.priority);
    } catch (error) {
      console.error('Error fetching rate limit rules:', error);
      throw new Error('Failed to fetch rate limit rules');
    }
  }

  async updateRateLimitRule(
    ruleId: string,
    updates: Partial<RateLimitRule>,
    updatedBy: string
  ): Promise<RateLimitRule> {
    try {
      const rule = this.rateLimitRules.get(ruleId);
      if (!rule) {
        throw new Error('Rate limit rule not found');
      }

      const updatedRule = {
        ...rule,
        ...updates,
        updatedAt: new Date()
      };

      this.rateLimitRules.set(ruleId, updatedRule);

      // Update cache
      await redis.hset('rate_limit_rules', ruleId, JSON.stringify(updatedRule));

      await this.logRateLimitEvent(ruleId, 'updated', `Rate limit rule updated by ${updatedBy}`);
      
      return updatedRule;
    } catch (error) {
      console.error('Error updating rate limit rule:', error);
      throw error;
    }
  }

  async deleteRateLimitRule(ruleId: string, deletedBy: string): Promise<void> {
    try {
      const rule = this.rateLimitRules.get(ruleId);
      if (!rule) {
        throw new Error('Rate limit rule not found');
      }

      this.rateLimitRules.delete(ruleId);

      // Remove from cache
      await redis.hdel('rate_limit_rules', ruleId);

      await this.logRateLimitEvent(ruleId, 'deleted', `Rate limit rule deleted by ${deletedBy}`);
    } catch (error) {
      console.error('Error deleting rate limit rule:', error);
      throw error;
    }
  }

  // Access Control Management
  async createAccessControlRule(
    rule: Omit<AccessControlRule, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<AccessControlRule> {
    try {
      const ruleId = `access_control_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newRule: AccessControlRule = {
        ...rule,
        id: ruleId,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.accessControlRules.set(ruleId, newRule);

      // Cache rule in Redis
      await redis.hset('access_control_rules', ruleId, JSON.stringify(newRule));

      await this.logRateLimitEvent(ruleId, 'access_control_created', `Access control rule created: ${rule.name}`);
      
      return newRule;
    } catch (error) {
      console.error('Error creating access control rule:', error);
      throw new Error('Failed to create access control rule');
    }
  }

  async getAccessControlRules(enabled?: boolean): Promise<AccessControlRule[]> {
    try {
      let rules = Array.from(this.accessControlRules.values());

      if (enabled !== undefined) {
        rules = rules.filter(rule => rule.enabled === enabled);
      }

      // Filter out expired rules
      const now = new Date();
      rules = rules.filter(rule => !rule.expiresAt || rule.expiresAt > now);

      return rules.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching access control rules:', error);
      throw new Error('Failed to fetch access control rules');
    }
  }

  async updateAccessControlRule(
    ruleId: string,
    updates: Partial<AccessControlRule>,
    updatedBy: string
  ): Promise<AccessControlRule> {
    try {
      const rule = this.accessControlRules.get(ruleId);
      if (!rule) {
        throw new Error('Access control rule not found');
      }

      const updatedRule = {
        ...rule,
        ...updates,
        updatedAt: new Date()
      };

      this.accessControlRules.set(ruleId, updatedRule);

      // Update cache
      await redis.hset('access_control_rules', ruleId, JSON.stringify(updatedRule));

      await this.logRateLimitEvent(ruleId, 'access_control_updated', `Access control rule updated by ${updatedBy}`);
      
      return updatedRule;
    } catch (error) {
      console.error('Error updating access control rule:', error);
      throw error;
    }
  }

  // Rate Limiting Enforcement
  async checkRateLimit(
    endpoint: string,
    method: string,
    key: string,
    metadata: {
      ipAddress: string;
      userId?: string;
      userAgent?: string;
    }
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
  }> {
    try {
      // Find applicable rate limit rules
      const applicableRules = Array.from(this.rateLimitRules.values())
        .filter(rule => 
          rule.enabled &&
          this.matchesEndpoint(endpoint, rule.endpoint) &&
          (rule.method === '*' || rule.method === method)
        )
        .sort((a, b) => a.priority - b.priority);

      if (applicableRules.length === 0) {
        return {
          allowed: true,
          limit: Infinity,
          remaining: Infinity,
          resetTime: new Date(Date.now() + 60000)
        };
      }

      // Check each rule (most restrictive wins)
      let mostRestrictive = {
        allowed: true,
        limit: Infinity,
        remaining: Infinity,
        resetTime: new Date(Date.now() + 60000),
        retryAfter: undefined as number | undefined
      };

      for (const rule of applicableRules) {
        const ruleKey = this.generateRateLimitKey(rule, key, metadata);
        const windowStart = Math.floor(Date.now() / rule.windowMs) * rule.windowMs;
        const windowEnd = windowStart + rule.windowMs;
        
        const current = await redis.get(ruleKey) || '0';
        const currentCount = parseInt(current);
        
        const remaining = Math.max(0, rule.limit - currentCount);
        const allowed = currentCount < rule.limit;

        if (!allowed) {
          // Record violation
          await this.recordViolation(rule, key, endpoint, method, metadata, currentCount);
          
          mostRestrictive = {
            allowed: false,
            limit: rule.limit,
            remaining: 0,
            resetTime: new Date(windowEnd),
            retryAfter: Math.ceil((windowEnd - Date.now()) / 1000)
          };
          break;
        }

        // Update most restrictive if this rule is more limiting
        if (remaining < mostRestrictive.remaining) {
          mostRestrictive = {
            allowed: true,
            limit: rule.limit,
            remaining,
            resetTime: new Date(windowEnd),
            retryAfter: undefined
          };
        }
      }

      return mostRestrictive;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        limit: Infinity,
        remaining: Infinity,
        resetTime: new Date(Date.now() + 60000)
      };
    }
  }

  async incrementRateLimit(
    endpoint: string,
    method: string,
    key: string,
    metadata: {
      ipAddress: string;
      userId?: string;
      userAgent?: string;
    },
    success: boolean
  ): Promise<void> {
    try {
      const applicableRules = Array.from(this.rateLimitRules.values())
        .filter(rule => 
          rule.enabled &&
          this.matchesEndpoint(endpoint, rule.endpoint) &&
          (rule.method === '*' || rule.method === method)
        );

      for (const rule of applicableRules) {
        // Skip if rule says to skip successful/failed requests
        if ((success && rule.skipSuccessfulRequests) || 
            (!success && rule.skipFailedRequests)) {
          continue;
        }

        const ruleKey = this.generateRateLimitKey(rule, key, metadata);
        const windowStart = Math.floor(Date.now() / rule.windowMs) * rule.windowMs;
        const ttl = Math.ceil(rule.windowMs / 1000);

        await redis.multi()
          .incr(ruleKey)
          .expire(ruleKey, ttl)
          .exec();
      }
    } catch (error) {
      console.error('Error incrementing rate limit:', error);
    }
  }

  // Access Control Enforcement
  async checkAccessControl(
    endpoint: string,
    method: string,
    metadata: {
      ipAddress: string;
      userId?: string;
      userAgent?: string;
      country?: string;
      apiKey?: string;
    }
  ): Promise<{
    allowed: boolean;
    reason?: string;
    ruleId?: string;
  }> {
    try {
      const applicableRules = Array.from(this.accessControlRules.values())
        .filter(rule => 
          rule.enabled &&
          (rule.endpoints.length === 0 || rule.endpoints.some(ep => this.matchesEndpoint(endpoint, ep))) &&
          (rule.methods.length === 0 || rule.methods.includes(method) || rule.methods.includes('*'))
        );

      for (const rule of applicableRules) {
        const targetValue = this.getTargetValue(rule.target, metadata);
        if (!targetValue) continue;

        const isMatch = rule.values.includes(targetValue);

        if (rule.type === 'blacklist' && isMatch) {
          return {
            allowed: false,
            reason: `Blocked by ${rule.type} rule: ${rule.name}`,
            ruleId: rule.id
          };
        }

        if (rule.type === 'whitelist' && !isMatch) {
          return {
            allowed: false,
            reason: `Not in ${rule.type} rule: ${rule.name}`,
            ruleId: rule.id
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking access control:', error);
      // Fail open - allow access if check fails
      return { allowed: true };
    }
  }

  // API Usage Analytics
  async getApiUsageMetrics(
    endpoint?: string,
    timeRange: { start: Date; end: Date } = {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    }
  ): Promise<ApiUsageMetrics[]> {
    try {
      // Mock implementation - in production, aggregate from logs/metrics
      const mockMetrics: ApiUsageMetrics[] = [
        {
          endpoint: '/api/bookings',
          method: 'GET',
          totalRequests: 15420,
          successfulRequests: 14890,
          failedRequests: 530,
          averageResponseTime: 245,
          rateLimitHits: 12,
          uniqueUsers: 1250,
          topUsers: [
            { userId: 'user_123', requests: 450, lastRequest: new Date() },
            { userId: 'user_456', requests: 380, lastRequest: new Date() },
            { userId: 'user_789', requests: 320, lastRequest: new Date() }
          ],
          hourlyBreakdown: Array.from({ length: 24 }, (_, i) => ({
            hour: `${i}:00`,
            requests: Math.floor(Math.random() * 1000) + 200,
            errors: Math.floor(Math.random() * 50)
          })),
          statusCodeBreakdown: {
            '200': 14890,
            '400': 320,
            '401': 85,
            '429': 12,
            '500': 113
          }
        }
      ];

      return endpoint 
        ? mockMetrics.filter(m => m.endpoint === endpoint)
        : mockMetrics;
    } catch (error) {
      console.error('Error fetching API usage metrics:', error);
      throw new Error('Failed to fetch API usage metrics');
    }
  }

  async getRateLimitViolations(
    limit: number = 100,
    ruleId?: string
  ): Promise<RateLimitViolation[]> {
    try {
      let violations = [...this.violations];

      if (ruleId) {
        violations = violations.filter(v => v.ruleId === ruleId);
      }

      return violations
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching rate limit violations:', error);
      throw new Error('Failed to fetch rate limit violations');
    }
  }

  // Private helper methods
  private matchesEndpoint(requestEndpoint: string, ruleEndpoint: string): boolean {
    if (ruleEndpoint === '*') return true;
    
    // Convert rule endpoint pattern to regex
    const pattern = ruleEndpoint
      .replace(/\*/g, '.*')
      .replace(/:\w+/g, '[^/]+'); // Replace :param with regex
    
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(requestEndpoint);
  }

  private generateRateLimitKey(
    rule: RateLimitRule,
    key: string,
    metadata: {
      ipAddress: string;
      userId?: string;
      userAgent?: string;
    }
  ): string {
    let keyPart: string;

    switch (rule.keyGenerator) {
      case 'ip':
        keyPart = metadata.ipAddress;
        break;
      case 'user':
        keyPart = metadata.userId || metadata.ipAddress;
        break;
      case 'api_key':
        keyPart = key;
        break;
      case 'custom':
        // In production, evaluate custom function
        keyPart = key;
        break;
      default:
        keyPart = key;
    }

    const windowStart = Math.floor(Date.now() / rule.windowMs) * rule.windowMs;
    return `rate_limit:${rule.id}:${keyPart}:${windowStart}`;
  }

  private getTargetValue(
    target: AccessControlRule['target'],
    metadata: {
      ipAddress: string;
      userId?: string;
      userAgent?: string;
      country?: string;
      apiKey?: string;
    }
  ): string | undefined {
    switch (target) {
      case 'ip':
        return metadata.ipAddress;
      case 'user':
        return metadata.userId;
      case 'user_agent':
        return metadata.userAgent;
      case 'country':
        return metadata.country;
      case 'api_key':
        return metadata.apiKey;
      default:
        return undefined;
    }
  }

  private async recordViolation(
    rule: RateLimitRule,
    key: string,
    endpoint: string,
    method: string,
    metadata: {
      ipAddress: string;
      userId?: string;
      userAgent?: string;
    },
    attempts: number
  ): Promise<void> {
    try {
      const violation: RateLimitViolation = {
        id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        key,
        endpoint,
        method,
        limit: rule.limit,
        attempts,
        windowStart: new Date(Math.floor(Date.now() / rule.windowMs) * rule.windowMs),
        windowEnd: new Date(Math.floor(Date.now() / rule.windowMs) * rule.windowMs + rule.windowMs),
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
        userId: metadata.userId,
        blocked: true,
        timestamp: new Date()
      };

      this.violations.push(violation);

      // Keep only last 10000 violations in memory
      if (this.violations.length > 10000) {
        this.violations = this.violations.slice(-10000);
      }

      await this.logRateLimitEvent(
        rule.id,
        'violation',
        `Rate limit violation: ${attempts}/${rule.limit} requests from ${metadata.ipAddress}`
      );
    } catch (error) {
      console.error('Error recording violation:', error);
    }
  }

  private async logRateLimitEvent(
    entityId: string,
    action: string,
    description: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: `RATE_LIMIT_${action.toUpperCase()}`,
          entityType: 'rate_limit',
          entityId,
          adminUserId: 'system',
          changes: { description },
          ipAddress: 'system'
        }
      });
    } catch (error) {
      console.error('Error logging rate limit event:', error);
    }
  }
}

export default ApiRateLimitingService;