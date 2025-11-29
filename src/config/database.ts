import { PrismaClient } from '@prisma/client';
import { config } from './env';

// Create a singleton instance of PrismaClient
let prisma: PrismaClient;

export function getDatabaseClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: config.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
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
