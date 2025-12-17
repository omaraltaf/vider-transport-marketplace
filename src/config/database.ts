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

export function getDatabaseClient(): PrismaClient {
  return prisma;
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
    if (prisma) {
      await prisma.$disconnect();
      console.log('✓ Database disconnected');
    }
  } catch (error) {
    console.error('✗ Database disconnection failed:', error);
    throw error;
  }
}

export { prisma };
