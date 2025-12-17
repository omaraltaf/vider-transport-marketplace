/**
 * Redis Configuration
 * Optional Redis connection with graceful fallback
 */

import Redis from 'ioredis';
import { logger } from './logger';

class OptionalRedis {
  private redis: Redis | null = null;
  private isConnected = false;

  constructor() {
    // Only attempt Redis connection if REDIS_URL is provided and not empty
    if (process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '') {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          connectTimeout: 5000,
          commandTimeout: 5000,
          enableOfflineQueue: false,
        });
        
        this.redis.on('connect', () => {
          this.isConnected = true;
          logger.info('Redis connected successfully');
        });

        this.redis.on('error', (error) => {
          this.isConnected = false;
          logger.warn('Redis connection error (continuing without cache)', { error: error.message });
          // Prevent unhandled error events by cleaning up
          if (this.redis) {
            try {
              this.redis.disconnect();
            } catch (e) {
              // Ignore disconnect errors
            }
            this.redis = null;
          }
        });

        this.redis.on('close', () => {
          this.isConnected = false;
          logger.info('Redis connection closed - continuing without cache');
        });

        // Attempt connection with timeout - but don't block startup
        setTimeout(() => {
          if (this.redis) {
            this.redis.connect().catch((error) => {
              logger.warn('Redis connection failed (continuing without cache)', { error: error.message });
              this.isConnected = false;
              if (this.redis) {
                try {
                  this.redis.disconnect();
                } catch (e) {
                  // Ignore disconnect errors
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
    } else {
      logger.info('Redis not configured - running without cache');
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