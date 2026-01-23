import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { env } from './env.js';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
        log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
