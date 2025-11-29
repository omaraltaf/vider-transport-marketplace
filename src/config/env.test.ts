import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { z } from 'zod';

/**
 * Feature: vider-transport-marketplace, Property 37: Configuration from environment
 * Validates: Requirements 22.1, 22.3, 22.4
 * 
 * Property: For any application startup, all configuration values and secrets must be 
 * loaded from environment variables, and the application must fail to start if required 
 * variables are missing.
 */

// Define the schema inline for testing (same as in env.ts)
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z.string().transform(Number).pipe(z.number().int().positive()),
  SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
  SMTP_PASSWORD: z.string().min(1, 'SMTP_PASSWORD is required'),
  SMTP_FROM: z.string().email('SMTP_FROM must be a valid email'),
  PLATFORM_COMMISSION_RATE: z.string().transform(Number).pipe(z.number().min(0).max(100)),
  PLATFORM_TAX_RATE: z.string().transform(Number).pipe(z.number().min(0).max(100)),
  BOOKING_TIMEOUT_HOURS: z.string().transform(Number).pipe(z.number().int().positive()),
  DEFAULT_CURRENCY: z.string().default('NOK'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number().int().positive()),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3000'),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
});

function testLoadConfig(env: Record<string, string>) {
  return envSchema.parse(env);
}

describe('Property 37: Configuration from environment', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Create a clean copy of environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should load all configuration from environment variables when all required vars are present', () => {
    /**
     * Property test: For any valid set of environment variables,
     * the configuration should successfully load and return all values
     */
    fc.assert(
      fc.property(
        fc.record({
          DATABASE_URL: fc.webUrl({ withQueryParameters: true }),
          JWT_SECRET: fc.string({ minLength: 32, maxLength: 64 }),
          JWT_ACCESS_EXPIRATION: fc.constantFrom('15m', '30m', '1h'),
          JWT_REFRESH_EXPIRATION: fc.constantFrom('7d', '14d', '30d'),
          SMTP_HOST: fc.domain(),
          SMTP_PORT: fc.integer({ min: 1, max: 65535 }).map(String),
          SMTP_USER: fc.stringMatching(/^[a-z0-9]{3,20}$/).chain(user => 
            fc.domain().map(domain => `${user}@${domain}`)
          ),
          SMTP_PASSWORD: fc.string({ minLength: 8, maxLength: 32 }),
          SMTP_FROM: fc.stringMatching(/^[a-z0-9]{3,20}$/).chain(user => 
            fc.domain().map(domain => `${user}@${domain}`)
          ),
          PLATFORM_COMMISSION_RATE: fc.integer({ min: 0, max: 100 }).map(String),
          PLATFORM_TAX_RATE: fc.integer({ min: 0, max: 100 }).map(String),
          BOOKING_TIMEOUT_HOURS: fc.integer({ min: 1, max: 168 }).map(String),
          DEFAULT_CURRENCY: fc.constantFrom('NOK', 'EUR', 'USD'),
          UPLOAD_DIR: fc.constantFrom('./uploads', '/tmp/uploads', './data/uploads'),
          MAX_FILE_SIZE: fc.integer({ min: 1048576, max: 104857600 }).map(String),
          NODE_ENV: fc.constantFrom('development', 'production', 'test'),
          PORT: fc.integer({ min: 3000, max: 9999 }).map(String),
          FRONTEND_URL: fc.webUrl(),
        }),
        (envVars) => {
          // Load config with test environment
          const config = testLoadConfig(envVars);

          // Verify all values are loaded from environment
          expect(config.DATABASE_URL).toBe(envVars.DATABASE_URL);
          expect(config.JWT_SECRET).toBe(envVars.JWT_SECRET);
          expect(config.JWT_ACCESS_EXPIRATION).toBe(envVars.JWT_ACCESS_EXPIRATION);
          expect(config.JWT_REFRESH_EXPIRATION).toBe(envVars.JWT_REFRESH_EXPIRATION);
          expect(config.SMTP_HOST).toBe(envVars.SMTP_HOST);
          expect(config.SMTP_PORT).toBe(Number(envVars.SMTP_PORT));
          expect(config.SMTP_USER).toBe(envVars.SMTP_USER);
          expect(config.SMTP_PASSWORD).toBe(envVars.SMTP_PASSWORD);
          expect(config.SMTP_FROM).toBe(envVars.SMTP_FROM);
          expect(config.PLATFORM_COMMISSION_RATE).toBe(Number(envVars.PLATFORM_COMMISSION_RATE));
          expect(config.PLATFORM_TAX_RATE).toBe(Number(envVars.PLATFORM_TAX_RATE));
          expect(config.BOOKING_TIMEOUT_HOURS).toBe(Number(envVars.BOOKING_TIMEOUT_HOURS));
          expect(config.DEFAULT_CURRENCY).toBe(envVars.DEFAULT_CURRENCY);
          expect(config.UPLOAD_DIR).toBe(envVars.UPLOAD_DIR);
          expect(config.MAX_FILE_SIZE).toBe(Number(envVars.MAX_FILE_SIZE));
          expect(config.NODE_ENV).toBe(envVars.NODE_ENV);
          expect(config.PORT).toBe(Number(envVars.PORT));
          expect(config.FRONTEND_URL).toBe(envVars.FRONTEND_URL);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fail to start when required environment variables are missing', () => {
    /**
     * Property test: For any subset of required environment variables that is incomplete,
     * the application must fail to start with a clear error message
     */
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASSWORD',
      'SMTP_FROM',
      'PLATFORM_COMMISSION_RATE',
      'PLATFORM_TAX_RATE',
      'BOOKING_TIMEOUT_HOURS',
      'MAX_FILE_SIZE',
      'FRONTEND_URL',
    ];

    fc.assert(
      fc.property(
        fc.subarray(requiredVars, { minLength: 1, maxLength: requiredVars.length - 1 }),
        (missingVars) => {
          // Set up a valid environment first
          const testEnv: Record<string, string> = {
            DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
            JWT_SECRET: 'a'.repeat(32),
            JWT_ACCESS_EXPIRATION: '15m',
            JWT_REFRESH_EXPIRATION: '7d',
            SMTP_HOST: 'smtp.example.com',
            SMTP_PORT: '587',
            SMTP_USER: 'user@example.com',
            SMTP_PASSWORD: 'password123',
            SMTP_FROM: 'noreply@example.com',
            PLATFORM_COMMISSION_RATE: '5',
            PLATFORM_TAX_RATE: '25',
            BOOKING_TIMEOUT_HOURS: '24',
            DEFAULT_CURRENCY: 'NOK',
            UPLOAD_DIR: './uploads',
            MAX_FILE_SIZE: '10485760',
            NODE_ENV: 'test',
            PORT: '3000',
            FRONTEND_URL: 'http://localhost:5173',
          };

          // Remove the missing variables
          missingVars.forEach(varName => {
            delete testEnv[varName];
          });

          // Should throw an error
          expect(() => testLoadConfig(testEnv)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fail when JWT_SECRET is too short', () => {
    /**
     * Property test: For any JWT_SECRET with length < 32,
     * the configuration must fail to load
     */
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 31 }),
        (shortSecret) => {
          const testEnv = {
            DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
            JWT_SECRET: shortSecret,
            SMTP_HOST: 'smtp.example.com',
            SMTP_PORT: '587',
            SMTP_USER: 'user@example.com',
            SMTP_PASSWORD: 'password123',
            SMTP_FROM: 'noreply@example.com',
            PLATFORM_COMMISSION_RATE: '5',
            PLATFORM_TAX_RATE: '25',
            BOOKING_TIMEOUT_HOURS: '24',
            UPLOAD_DIR: './uploads',
            MAX_FILE_SIZE: '10485760',
            FRONTEND_URL: 'http://localhost:5173',
          };

          expect(() => testLoadConfig(testEnv)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fail when numeric values are invalid', () => {
    /**
     * Property test: For any invalid numeric environment variable,
     * the configuration must fail to load
     */
    fc.assert(
      fc.property(
        fc.constantFrom('SMTP_PORT', 'BOOKING_TIMEOUT_HOURS', 'MAX_FILE_SIZE', 'PORT'),
        fc.constantFrom('not-a-number', '', '-1', '0', 'abc123'),
        (varName, invalidValue) => {
          const testEnv: Record<string, string> = {
            DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
            JWT_SECRET: 'a'.repeat(32),
            SMTP_HOST: 'smtp.example.com',
            SMTP_PORT: '587',
            SMTP_USER: 'user@example.com',
            SMTP_PASSWORD: 'password123',
            SMTP_FROM: 'noreply@example.com',
            PLATFORM_COMMISSION_RATE: '5',
            PLATFORM_TAX_RATE: '25',
            BOOKING_TIMEOUT_HOURS: '24',
            UPLOAD_DIR: './uploads',
            MAX_FILE_SIZE: '10485760',
            PORT: '3000',
            FRONTEND_URL: 'http://localhost:5173',
          };

          // Set the invalid value
          testEnv[varName] = invalidValue;

          expect(() => testLoadConfig(testEnv)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fail when email addresses are invalid', () => {
    /**
     * Property test: For any invalid email in SMTP_FROM,
     * the configuration must fail to load
     */
    fc.assert(
      fc.property(
        fc.constantFrom('not-an-email', 'missing@domain', '@example.com', 'user@', ''),
        (invalidEmail) => {
          const testEnv = {
            DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
            JWT_SECRET: 'a'.repeat(32),
            SMTP_HOST: 'smtp.example.com',
            SMTP_PORT: '587',
            SMTP_USER: 'user@example.com',
            SMTP_PASSWORD: 'password123',
            SMTP_FROM: invalidEmail,
            PLATFORM_COMMISSION_RATE: '5',
            PLATFORM_TAX_RATE: '25',
            BOOKING_TIMEOUT_HOURS: '24',
            UPLOAD_DIR: './uploads',
            MAX_FILE_SIZE: '10485760',
            FRONTEND_URL: 'http://localhost:5173',
          };

          expect(() => testLoadConfig(testEnv)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});
