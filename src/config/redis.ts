/**
 * Redis Configuration
 * Optional Redis connection with graceful fallback
 */

import Redis from 'ioredis';
import { logger } from './logger';

class OptionalRedis {
  private redis: Redis | null = null;
  private isConnected = false;
  private initializationAttempted = false;

  constructor() {
    // Prevent multiple initialization attempts
    if (this.initializationAttempted) {
      return;
    }
    this.initializationAttempted = true;

    // Completely skip Redis initialization if no REDIS_URL is provided
    if (!process.env.REDIS_URL || process.env.REDIS_URL.trim() === '') {
      logger.info('Redis not configured - running without cache');
      return;
    }

    try {
      this.redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null, // Completely disable retries
        lazyConnect: true,
        connectTimeout: 3000,
        commandTimeout: 3000,
        enableOfflineQueue: false,
        showFriendlyErrorStack: false,
      });
      
      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected successfully');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        // Only log once to prevent spam
        if (this.redis) {
          logger.warn('Redis connection failed - disabling Redis cache permanently', { error: error.message });
          // Immediately disconnect and cleanup to prevent further errors
          try {
            this.redis.removeAllListeners();
            this.redis.disconnect();
          } catch (e) {
            // Ignore cleanup errors
          }
          this.redis = null;
        }
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        logger.info('Redis connection closed - continuing without cache');
      });

      // Only attempt connection if Redis instance still exists
      setTimeout(() => {
        if (this.redis) {
          this.redis.connect().catch((error) => {
            logger.warn('Redis connection failed (continuing without cache)', { error: error.message });
            this.isConnected = false;
            if (this.redis) {
              try {
                this.redis.removeAllListeners();
                this.redis.disconnect();
              } catch (e) {
                // Ignore cleanup errors
              }
              this.redis = null;
            }
          });
        }
      }, 100);
    } catch (error) {
      logger.warn('Failed to initialize Redis (continuing without cache)', { error });
      this.redis = null;
      this.isConnected = false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected || !this.redis) {
      return null;
    }
    
    try {
      return await this.redis.get(key);
    } catch (error) {
      logger.warn('Redis get failed', { key, error });
      return null;
    }
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return;
    }
    
    try {
      await this.redis.setex(key, seconds, value);
    } catch (error) {
      logger.warn('Redis setex failed', { key, error });
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return;
    }
    
    try {
      await this.redis.del(...keys);
    } catch (error) {
      logger.warn('Redis del failed', { keys, error });
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isConnected || !this.redis) {
      return [];
    }
    
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      logger.warn('Redis keys failed', { pattern, error });
      return [];
    }
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return;
    }
    
    try {
      await this.redis.hset(key, field, value);
    } catch (error) {
      logger.warn('Redis hset failed', { key, field, error });
    }
  }

  async hdel(key: string, field: string): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return;
    }
    
    try {
      await this.redis.hdel(key, field);
    } catch (error) {
      logger.warn('Redis hdel failed', { key, field, error });
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.isConnected || !this.redis) {
      return null;
    }
    
    try {
      return await this.redis.hget(key, field);
    } catch (error) {
      logger.warn('Redis hget failed', { key, field, error });
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.isConnected || !this.redis) {
      return {};
    }
    
    try {
      return await this.redis.hgetall(key);
    } catch (error) {
      logger.warn('Redis hgetall failed', { key, error });
      return {};
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return;
    }
    
    try {
      await this.redis.set(key, value);
    } catch (error) {
      logger.warn('Redis set failed', { key, error });
    }
  }

  async flushall(): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return;
    }
    
    try {
      await this.redis.flushall();
    } catch (error) {
      logger.warn('Redis flushall failed', { error });
    }
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    if (!this.isConnected || !this.redis) {
      return keys.map(() => null);
    }
    
    try {
      return await this.redis.mget(...keys);
    } catch (error) {
      logger.warn('Redis mget failed', { keys, error });
      return keys.map(() => null);
    }
  }

  async hmget(key: string, ...fields: string[]): Promise<(string | null)[]> {
    if (!this.isConnected || !this.redis) {
      return fields.map(() => null);
    }
    
    try {
      return await this.redis.hmget(key, ...fields);
    } catch (error) {
      logger.warn('Redis hmget failed', { key, fields, error });
      return fields.map(() => null);
    }
  }

  async info(section?: string): Promise<string> {
    if (!this.isConnected || !this.redis) {
      return '';
    }
    
    try {
      return await this.redis.info(section);
    } catch (error) {
      logger.warn('Redis info failed', { section, error });
      return '';
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.isConnected || !this.redis) {
      return 0;
    }
    
    try {
      return await this.redis.incr(key);
    } catch (error) {
      logger.warn('Redis incr failed', { key, error });
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.isConnected || !this.redis) {
      return 0;
    }
    
    try {
      return await this.redis.expire(key, seconds);
    } catch (error) {
      logger.warn('Redis expire failed', { key, seconds, error });
      return 0;
    }
  }

  multi() {
    if (!this.isConnected || !this.redis) {
      // Return a mock multi that does nothing
      const mockMulti = {
        set: () => mockMulti,
        setex: () => mockMulti,
        del: () => mockMulti,
        hset: () => mockMulti,
        hdel: () => mockMulti,
        incr: () => mockMulti,
        decr: () => mockMulti,
        expire: () => mockMulti,
        exec: async () => []
      };
      return mockMulti;
    }
    
    return this.redis.multi();
  }

  pipeline() {
    if (!this.isConnected || !this.redis) {
      // Return a mock pipeline that does nothing
      return {
        set: () => this.pipeline(),
        setex: () => this.pipeline(),
        del: () => this.pipeline(),
        exec: async () => []
      };
    }
    
    return this.redis.pipeline();
  }

  async ping(): Promise<string> {
    if (!this.isConnected || !this.redis) {
      throw new Error('Redis not connected');
    }
    
    try {
      return await this.redis.ping();
    } catch (error) {
      logger.warn('Redis ping failed', { error });
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.isConnected && this.redis !== null;
  }
}

export const redis = new OptionalRedis();