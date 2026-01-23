import { z } from 'zod';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
    PORT: z.string().default('3000').transform(Number),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url(),
    FIREBASE_PROJECT_ID: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
    JWT_SECRET: z.string().default('development-secret'),
    PLATFORM_COMMISSION_RATE: z.string().default('10').transform(Number),
    PLATFORM_TAX_RATE: z.string().default('25').transform(Number),
    DEFAULT_CURRENCY: z.string().default('NOK'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error('❌ Invalid environment variables:', _env.error.format());
    process.exit(1);
}

export const env = _env.data;
