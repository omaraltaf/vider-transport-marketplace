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
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL);
        
        this.redis.on('connect', () => {
          this.isConnected = true;
          logger.info('Redis connected successfully');
        });

        this.redis.on('error', (error) => {
          this.isConnected = false;
          logger.warn('Redis connection error (continuing without cache)', { error: error.message });
        });

        this.redis.on('close', () => {
          this.isConnected = false;
          logger.warn('Redis connection closed');
        });
      } catch (error) {
        logger.warn('Failed to initialize Redis (continuing without cache)', { error });
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

  isAvailable(): boolean {
    return this.isConnected && this.redis !== null;
  }
}

export const redis = new OptionalRedis();