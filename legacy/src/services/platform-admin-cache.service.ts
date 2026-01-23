import { redis } from '../config/redis';
import { logger as Logger } from '../config/logger';

/**
 * Platform Admin Cache Service
 * 
 * Provides intelligent caching for platform admin operations
 * with automatic invalidation, performance monitoring, and fallback mechanisms.
 */
export class PlatformAdminCacheService {
  private static instance: PlatformAdminCacheService;
  private logger = Logger;
  private redis = redis;
  
  // Cache performance metrics
  private metrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    totalRequests: 0,
  };

  public static getInstance(): PlatformAdminCacheService {
    if (!PlatformAdminCacheService.instance) {
      PlatformAdminCacheService.instance = new PlatformAdminCacheService();
    }
    return PlatformAdminCacheService.instance;
  }

  /**
   * Cache key generation with consistent naming
   */
  private generateKey(service: string, method: string, params?: Record<string, any>): string {
    const baseKey = `platform_admin:${service}:${method}`;
    
    if (!params || Object.keys(params).length === 0) {
      return baseKey;
    }

    // Sort parameters for consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    
    return `${baseKey}:${Buffer.from(sortedParams).toString('base64')}`;
  }

  /**
   * Get cached data with automatic metrics tracking
   */
  async get<T>(
    service: string,
    method: string,
    params?: Record<string, any>
  ): Promise<T | null> {
    this.metrics.totalRequests++;
    
    try {
      if (!this.redis) {
        this.logger.warn('Redis not available for cache get operation');
        this.metrics.errors++;
        return null;
      }

      const key = this.generateKey(service, method, params);
      const cached = await this.redis.get(key);
      
      if (cached) {
        this.metrics.hits++;
        this.logger.debug(`Cache hit for ${service}.${method}`, { key });
        return JSON.parse(cached);
      } else {
        this.metrics.misses++;
        this.logger.debug(`Cache miss for ${service}.${method}`, { key });
        return null;
      }
    } catch (error) {
      this.metrics.errors++;
      this.logger.error(`Cache get error for ${service}.${method}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Set cached data with TTL and compression for large objects
   */
  async set<T>(
    service: string,
    method: string,
    data: T,
    ttl: number = 1800, // 30 minutes default
    params?: Record<string, any>
  ): Promise<void> {
    try {
      if (!this.redis) {
        this.logger.warn('Redis not available for cache set operation');
        return;
      }

      const key = this.generateKey(service, method, params);
      const serialized = JSON.stringify(data);
      
      // Log large cache entries
      if (serialized.length > 100000) { // 100KB
        this.logger.warn(`Large cache entry detected for ${service}.${method}`, {
          key,
          size: serialized.length,
        });
      }

      await this.redis.setex(key, ttl, serialized);
      
      this.logger.debug(`Cache set for ${service}.${method}`, { 
        key, 
        ttl, 
        size: serialized.length 
      });
    } catch (error) {
      this.logger.error(`Cache set error for ${service}.${method}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidate(service: string, method?: string): Promise<void> {
    try {
      if (!this.redis) {
        this.logger.warn('Redis not available for cache invalidation');
        return;
      }

      const pattern = method 
        ? `platform_admin:${service}:${method}*`
        : `platform_admin:${service}*`;
      
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.info(`Invalidated ${keys.length} cache entries`, { 
          service, 
          method, 
          pattern 
        });
      }
    } catch (error) {
      this.logger.error(`Cache invalidation error for ${service}`, {
        service,
        method,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Cache with automatic refresh and fallback
   */
  async getOrSet<T>(
    service: string,
    method: string,
    dataProvider: () => Promise<T>,
    ttl: number = 1800,
    params?: Record<string, any>
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(service, method, params);
    if (cached !== null) {
      return cached;
    }

    // Get fresh data
    const freshData = await dataProvider();
    
    // Cache the fresh data (fire and forget)
    this.set(service, method, freshData, ttl, params).catch(error => {
      this.logger.warn(`Failed to cache fresh data for ${service}.${method}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return freshData;
  }

  /**
   * Batch cache operations for efficiency
   */
  async getBatch<T>(
    requests: Array<{
      service: string;
      method: string;
      params?: Record<string, any>;
    }>
  ): Promise<Array<T | null>> {
    try {
      if (!this.redis) {
        return new Array(requests.length).fill(null);
      }

      const keys = requests.map(req => 
        this.generateKey(req.service, req.method, req.params)
      );
      
      const results = await this.redis.mget(...keys);
      
      return results.map((result, index) => {
        this.metrics.totalRequests++;
        
        if (result) {
          this.metrics.hits++;
          try {
            return JSON.parse(result);
          } catch (error) {
            this.logger.warn(`Failed to parse cached data for batch request ${index}`);
            this.metrics.errors++;
            return null;
          }
        } else {
          this.metrics.misses++;
          return null;
        }
      });
    } catch (error) {
      this.logger.error('Batch cache get error', {
        error: error instanceof Error ? error.message : String(error),
        requestCount: requests.length,
      });
      
      this.metrics.errors += requests.length;
      return new Array(requests.length).fill(null);
    }
  }

  /**
   * Set batch cache entries
   */
  async setBatch<T>(
    entries: Array<{
      service: string;
      method: string;
      data: T;
      ttl?: number;
      params?: Record<string, any>;
    }>
  ): Promise<void> {
    try {
      if (!this.redis) {
        return;
      }

      // Use pipeline for efficient batch operations
      const pipeline = this.redis.pipeline();
      
      for (const entry of entries) {
        const key = this.generateKey(entry.service, entry.method, entry.params);
        const ttl = entry.ttl || 1800;
        pipeline.setex(key, ttl, JSON.stringify(entry.data));
      }
      
      await pipeline.exec();
      
      this.logger.debug(`Batch cache set completed`, { 
        entryCount: entries.length 
      });
    } catch (error) {
      this.logger.error('Batch cache set error', {
        error: error instanceof Error ? error.message : String(error),
        entryCount: entries.length,
      });
    }
  }

  /**
   * Cache warming for frequently accessed data
   */
  async warmCache(
    warmingTasks: Array<{
      service: string;
      method: string;
      dataProvider: () => Promise<any>;
      ttl?: number;
      params?: Record<string, any>;
    }>
  ): Promise<void> {
    this.logger.info(`Starting cache warming for ${warmingTasks.length} tasks`);
    
    const promises = warmingTasks.map(async (task) => {
      try {
        const data = await task.dataProvider();
        await this.set(
          task.service,
          task.method,
          data,
          task.ttl || 3600, // 1 hour default for warmed cache
          task.params
        );
        
        this.logger.debug(`Cache warmed for ${task.service}.${task.method}`);
      } catch (error) {
        this.logger.error(`Cache warming failed for ${task.service}.${task.method}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
    
    await Promise.allSettled(promises);
    this.logger.info('Cache warming completed');
  }

  /**
   * Get cache performance metrics
   */
  getMetrics() {
    const hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.hits / this.metrics.totalRequests) * 100 
      : 0;
    
    const errorRate = this.metrics.totalRequests > 0
      ? (this.metrics.errors / this.metrics.totalRequests) * 100
      : 0;

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalRequests: 0,
    };
  }

  /**
   * Cache health check
   */
  async healthCheck(): Promise<{
    redis: boolean;
    latency: number;
    metrics: ReturnType<typeof this.getMetrics>;
  }> {
    const startTime = Date.now();
    let redisHealthy = false;
    
    try {
      if (this.redis) {
        await this.redis.ping();
        redisHealthy = true;
      }
    } catch (error) {
      this.logger.warn('Redis health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    
    const latency = Date.now() - startTime;
    
    return {
      redis: redisHealthy,
      latency,
      metrics: this.getMetrics(),
    };
  }

  /**
   * Predefined cache configurations for different data types
   */
  static getCacheConfig() {
    return {
      // User data - moderate TTL, frequent updates
      userData: { ttl: 900 }, // 15 minutes
      
      // Financial data - short TTL, high accuracy needed
      financialData: { ttl: 300 }, // 5 minutes
      
      // Analytics data - longer TTL, expensive to compute
      analyticsData: { ttl: 1800 }, // 30 minutes
      
      // System configuration - long TTL, rarely changes
      systemConfig: { ttl: 3600 }, // 1 hour
      
      // Geographic data - very long TTL, static data
      geographicData: { ttl: 7200 }, // 2 hours
      
      // Content moderation - short TTL, needs to be current
      contentModeration: { ttl: 600 }, // 10 minutes
      
      // Support tickets - short TTL, frequently updated
      supportData: { ttl: 300 }, // 5 minutes
    };
  }
}