import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define the schema for environment variables
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Authentication (Legacy - Firebase is primary now)
  JWT_SECRET: z.string().min(1).default('development-secret-key-min-32-chars-long'),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  // Email (optional - if not configured, emails will be logged only)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform((val) => val ? Number(val) : undefined).pipe(z.number().int().positive().optional()),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email('SMTP_FROM must be a valid email').optional(),

  // Platform Configuration
  PLATFORM_COMMISSION_RATE: z.string().transform(Number).pipe(z.number().min(0).max(100)),
  PLATFORM_TAX_RATE: z.string().transform(Number).pipe(z.number().min(0).max(100)),
  BOOKING_TIMEOUT_HOURS: z.string().transform(Number).pipe(z.number().int().positive()),
  DEFAULT_CURRENCY: z.string().default('NOK'),

  // File Storage
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number().int().positive()),

  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3000'),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),

  // Firebase (Google Stack)
  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
  FIREBASE_CLIENT_EMAIL: z.string().email('FIREBASE_CLIENT_EMAIL must be a valid email'),
  FIREBASE_PRIVATE_KEY: z.string().min(1, 'FIREBASE_PRIVATE_KEY is required'),

  // Google Cloud Storage
  GCS_BUCKET_NAME: z.string().min(1, 'GCS_BUCKET_NAME is required'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates and parses environment variables
 * Throws an error if required variables are missing or invalid
 */
export function loadConfig(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(
        `Environment configuration error:\n${missingVars.join('\n')}\n\n` +
        'Please check your .env file and ensure all required variables are set. ' +
        'See .env.example for reference.'
      );
    }
    throw error;
  }
}

// Export the validated configuration
export const config = loadConfig();
