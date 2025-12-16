import jwt from 'jsonwebtoken';

export function generateTestToken(userId: string, role: string): string {
  const payload = {
    userId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');
}

export function generateExpiredToken(userId: string, role: string): string {
  const payload = {
    userId,
    role,
    iat: Math.floor(Date.now() / 1000) - (60 * 60 * 2), // 2 hours ago
    exp: Math.floor(Date.now() / 1000) - (60 * 60), // 1 hour ago (expired)
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');
}

export function generateInvalidToken(): string {
  return 'invalid.jwt.token';
}

export const TEST_USERS = {
  PLATFORM_ADMIN: {
    id: 'test-platform-admin-id',
    email: 'platform-admin@test.com',
    role: 'PLATFORM_ADMIN',
  },
  COMPANY_ADMIN: {
    id: 'test-company-admin-id',
    email: 'company-admin@test.com',
    role: 'COMPANY_ADMIN',
  },
  USER: {
    id: 'test-user-id',
    email: 'user@test.com',
    role: 'USER',
  },
} as const;