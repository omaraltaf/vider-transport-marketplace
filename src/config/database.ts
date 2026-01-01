import { PrismaClient } from '@prisma/client';
import { config } from './env';

// Create a singleton instance of PrismaClient with connection pooling
const prisma = new PrismaClient({
  log: config.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: config.DATABASE_URL,
    },
  },
});

// Add connection pooling configuration to prevent memory issues
const connectionString = new URL(config.DATABASE_URL);
connectionString.searchParams.set('connection_limit', '10');
connectionString.searchParams.set('pool_timeout', '20');
connectionString.searchParams.set('connect_timeout', '60');

// Create optimized client for production
const optimizedPrisma = new PrismaClient({
  log: config.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: connectionString.toString(),
    },
  },
});

export function getDatabaseClient(): PrismaClient {
  return config.NODE_ENV === 'production' ? optimizedPrisma : prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    const client = getDatabaseClient();
    await client.$connect();
    console.log('✓ Database connected successfully');
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    const client = getDatabaseClient();
    if (client) {
      await client.$disconnect();
      console.log('✓ Database disconnected');
    }
  } catch (error) {
    console.error('✗ Database disconnection failed:', error);
    throw error;
  }
}

export { prisma };
