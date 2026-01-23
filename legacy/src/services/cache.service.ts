import Redis from 'ioredis';
import { logger } from '../utils/logger';

class CacheService {
  private redis: Redis | null = null;
  private isConnected = false;

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const redisPassword = process.env.REDIS_PASSWORD;

      this.redis = new Redis(redisUrl, {
        password: redisPassword || undefined,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected successfully');
      });

      this.redis.on('error', (error: any) => {
        this.isConnected = false;
        logger.error('Redis connection error:', error);
      });
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.redis = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis || !this.isConnected) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      const ttl = ttlSeconds || parseInt(process.env.CACHE_TTL_SECONDS || '300');
      
      await this.redis.setex(key, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error(`Cache pattern invalidation error for pattern ${pattern}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists check error for key ${key}:`, error);
      return false;
    }
  }

  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, fetch the data
    const data = await fetchFunction();
    
    // Store in cache for next time
    await this.set(key, data, ttlSeconds);
    
    return data;
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      this.redis.disconnect();
      this.isConnected = false;
    }
  }
}

export const cacheService = new CacheService();