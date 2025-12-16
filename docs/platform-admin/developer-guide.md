# Platform Admin Developer Guide

## Overview

This guide provides comprehensive technical documentation for developers working on the Platform Admin Dashboard. It covers architecture, development setup, coding standards, testing practices, and deployment procedures.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Architecture Overview](#architecture-overview)
3. [Code Structure](#code-structure)
4. [Development Workflow](#development-workflow)
5. [Testing Strategy](#testing-strategy)
6. [API Development](#api-development)
7. [Frontend Development](#frontend-development)
8. [Database Management](#database-management)
9. [Security Implementation](#security-implementation)
10. [Performance Optimization](#performance-optimization)
11. [Deployment Guide](#deployment-guide)
12. [Troubleshooting](#troubleshooting)

## Development Environment Setup

### Prerequisites

- **Node.js**: Version 18.x or higher
- **PostgreSQL**: Version 14.x or higher
- **Redis**: Version 6.x or higher (for caching and sessions)
- **Git**: Latest version
- **Docker**: Optional, for containerized development

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/vider/platform-admin-dashboard.git
   cd platform-admin-dashboard
   ```

2. **Install Dependencies**
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   ```bash
   # Create database
   createdb vider_platform_dev
   
   # Run migrations
   npx prisma migrate dev
   
   # Seed development data
   npm run seed:dev
   ```

5. **Start Development Servers**
   ```bash
   # Backend (Terminal 1)
   npm run dev
   
   # Frontend (Terminal 2)
   cd frontend && npm run dev
   ```

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/vider_platform_dev"

# Authentication
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRATION="24h"

# Redis
REDIS_URL="redis://localhost:6379"

# Email (Development)
SMTP_HOST="localhost"
SMTP_PORT=1025
SMTP_USER=""
SMTP_PASS=""

# File Storage
STORAGE_TYPE="local"
STORAGE_PATH="./uploads"

# Feature Flags
ENABLE_ADVANCED_ANALYTICS=true
ENABLE_REAL_TIME_MONITORING=true
ENABLE_SECURITY_MONITORING=true

# Development
NODE_ENV="development"
LOG_LEVEL="debug"
```

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   Pages     │ │ Components  │ │     Services        │   │
│  │             │ │             │ │                     │   │
│  │ • Dashboard │ │ • UI Comps  │ │ • API Clients       │   │
│  │ • Users     │ │ • Forms     │ │ • State Management  │   │
│  │ • Companies │ │ • Charts    │ │ • Utilities         │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   Routes    │ │ Middleware  │ │     Services        │   │
│  │             │ │             │ │                     │   │
│  │ • Auth      │ │ • Auth      │ │ • Business Logic    │   │
│  │ • Users     │ │ • Logging   │ │ • Data Processing   │   │
│  │ • Analytics │ │ • Validation│ │ • External APIs     │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Prisma ORM
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database (PostgreSQL)                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ Core Models │ │ Audit Models│ │  Security Models    │   │
│  │             │ │             │ │                     │   │
│  │ • Users     │ │ • Audit Logs│ │ • Security Events   │   │
│  │ • Companies │ │ • Changes   │ │ • Security Alerts   │   │
│  │ • Bookings  │ │ • Reports   │ │ • Threat Analysis   │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Caching**: Redis
- **Authentication**: JWT
- **Validation**: Zod
- **Testing**: Vitest, Supertest

#### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Custom components + Headless UI
- **State Management**: React Query + Zustand
- **Charts**: Recharts
- **Testing**: Vitest, React Testing Library

#### DevOps & Tools
- **Version Control**: Git
- **CI/CD**: GitHub Actions
- **Containerization**: Docker
- **Monitoring**: Custom monitoring + External services
- **Documentation**: Markdown + JSDoc

## Code Structure

### Backend Structure

```
src/
├── app.ts                 # Express app configuration
├── server.ts             # Server entry point
├── config/               # Configuration files
│   ├── database.ts       # Database configuration
│   ├── env.ts           # Environment variables
│   ├── logger.ts        # Logging configuration
│   └── redis.ts         # Redis configuration
├── routes/              # API route definitions
│   ├── auth.routes.ts
│   ├── user-management.routes.ts
│   ├── analytics.routes.ts
│   └── ...
├── services/            # Business logic services
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── analytics.service.ts
│   └── ...
├── middleware/          # Express middleware
│   ├── auth.middleware.ts
│   ├── validation.middleware.ts
│   ├── audit-logging.middleware.ts
│   └── ...
├── models/              # Data models and types
│   ├── user.model.ts
│   ├── company.model.ts
│   └── ...
├── utils/               # Utility functions
│   ├── encryption.utils.ts
│   ├── validation.utils.ts
│   └── ...
├── tests/               # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── types/               # TypeScript type definitions
    ├── api.types.ts
    ├── auth.types.ts
    └── ...
```

### Frontend Structure

```
frontend/src/
├── main.tsx             # Application entry point
├── App.tsx              # Root component
├── components/          # Reusable UI components
│   ├── ui/              # Basic UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── ...
│   └── platform-admin/  # Feature-specific components
│       ├── UserManagementPanel.tsx
│       ├── AnalyticsDashboard.tsx
│       └── ...
├── pages/               # Page components
│   ├── Dashboard.tsx
│   ├── Users.tsx
│   ├── Companies.tsx
│   └── ...
├── services/            # API services and utilities
│   ├── api.service.ts
│   ├── auth.service.ts
│   ├── user.service.ts
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useAuth.ts
│   ├── useUsers.ts
│   └── ...
├── stores/              # State management
│   ├── authStore.ts
│   ├── userStore.ts
│   └── ...
├── utils/               # Utility functions
│   ├── formatters.ts
│   ├── validators.ts
│   └── ...
├── types/               # TypeScript types
│   ├── api.types.ts
│   ├── user.types.ts
│   └── ...
└── styles/              # Global styles
    ├── globals.css
    └── components.css
```

## Development Workflow

### Git Workflow

We follow the **Git Flow** branching model:

```
main (production)
├── develop (integration)
│   ├── feature/user-management-enhancement
│   ├── feature/analytics-dashboard-v2
│   └── feature/security-monitoring-alerts
├── release/v1.1.0
├── hotfix/critical-security-patch
└── ...
```

#### Branch Types

1. **main**: Production-ready code
2. **develop**: Integration branch for features
3. **feature/**: New features and enhancements
4. **release/**: Release preparation
5. **hotfix/**: Critical production fixes

#### Commit Convention

We use **Conventional Commits** format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(user-management): add bulk user operations
fix(analytics): resolve date range filter issue
docs(api): update authentication documentation
test(security): add integration tests for audit logging
```

### Code Review Process

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Develop and Test**
   ```bash
   # Make changes
   npm test
   npm run lint
   npm run type-check
   ```

3. **Create Pull Request**
   - Descriptive title and description
   - Link to related issues
   - Include screenshots for UI changes
   - Ensure all checks pass

4. **Code Review**
   - At least one approval required
   - Address all feedback
   - Ensure tests pass

5. **Merge to Develop**
   ```bash
   git checkout develop
   git merge --no-ff feature/your-feature-name
   git push origin develop
   ```

## Testing Strategy

### Testing Pyramid

```
                    ┌─────────────────┐
                    │   E2E Tests     │ (Few)
                    │                 │
                    └─────────────────┘
                ┌─────────────────────────┐
                │  Integration Tests      │ (Some)
                │                         │
                └─────────────────────────┘
        ┌─────────────────────────────────────────┐
        │           Unit Tests                    │ (Many)
        │                                         │
        └─────────────────────────────────────────┘
```

### Unit Tests

**Location**: `src/tests/unit/`

**Framework**: Vitest

**Coverage Target**: 80%+

```typescript
// Example unit test
import { describe, it, expect, vi } from 'vitest';
import { UserService } from '../services/user.service';
import { prisma } from '../config/database';

vi.mock('../config/database');

describe('UserService', () => {
  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'COMPANY_USER'
      };
      
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      
      const userService = new UserService();
      const result = await userService.getUserById('user-1');
      
      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' }
      });
    });
  });
});
```

### Integration Tests

**Location**: `src/tests/integration/`

**Framework**: Vitest + Supertest

```typescript
// Example integration test
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/database';

describe('User Management API', () => {
  let authToken: string;
  
  beforeAll(async () => {
    // Setup test data
    authToken = await getTestAuthToken();
  });
  
  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });
  
  describe('GET /api/platform-admin/users', () => {
    it('should return paginated users list', async () => {
      const response = await request(app)
        .get('/api/platform-admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20 });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });
  });
});
```

### End-to-End Tests

**Location**: `src/tests/e2e/`

**Framework**: Playwright

```typescript
// Example E2E test
import { test, expect } from '@playwright/test';

test.describe('Platform Admin Dashboard', () => {
  test('should complete user management workflow', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'admin@test.com');
    await page.fill('[data-testid=password]', 'password');
    await page.click('[data-testid=login-button]');
    
    // Navigate to users
    await page.click('[data-testid=users-nav]');
    await expect(page).toHaveURL('/users');
    
    // Create new user
    await page.click('[data-testid=create-user-button]');
    await page.fill('[data-testid=user-email]', 'newuser@test.com');
    await page.selectOption('[data-testid=user-role]', 'COMPANY_USER');
    await page.click('[data-testid=save-user-button]');
    
    // Verify user created
    await expect(page.locator('[data-testid=user-list]')).toContainText('newuser@test.com');
  });
});
```

### Property-Based Testing

For critical business logic, we use property-based testing:

```typescript
import { fc, test } from '@fast-check/vitest';

test.prop([fc.array(fc.record({
  id: fc.uuid(),
  role: fc.constantFrom('PLATFORM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER'),
  status: fc.constantFrom('active', 'suspended')
}))])('user filtering should preserve user count', (users) => {
  const activeUsers = filterUsersByStatus(users, 'active');
  const suspendedUsers = filterUsersByStatus(users, 'suspended');
  
  expect(activeUsers.length + suspendedUsers.length).toBeLessThanOrEqual(users.length);
});
```

### Test Commands

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## API Development

### API Design Principles

1. **RESTful Design**: Follow REST conventions
2. **Consistent Responses**: Standardized response format
3. **Proper HTTP Status Codes**: Use appropriate status codes
4. **Pagination**: Implement pagination for list endpoints
5. **Filtering & Sorting**: Support query parameters
6. **Versioning**: API versioning strategy
7. **Documentation**: Comprehensive API documentation

### Route Structure

```typescript
// routes/user-management.routes.ts
import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { auditLogMiddleware } from '../middleware/audit-logging.middleware';
import { userSchemas } from '../schemas/user.schemas';

const router = Router();
const userController = new UserController();

// Apply middleware
router.use(authMiddleware);
router.use(auditLogMiddleware);

// Routes
router.get('/', 
  validateRequest(userSchemas.listUsers), 
  userController.listUsers
);

router.get('/:userId', 
  validateRequest(userSchemas.getUser), 
  userController.getUser
);

router.put('/:userId', 
  validateRequest(userSchemas.updateUser), 
  userController.updateUser
);

router.post('/bulk', 
  validateRequest(userSchemas.bulkOperation), 
  userController.bulkOperation
);

export default router;
```

### Controller Pattern

```typescript
// controllers/user.controller.ts
import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { ApiResponse } from '../types/api.types';

export class UserController {
  private userService = new UserService();

  listUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 20, search, role, status } = req.query;
      
      const result = await this.userService.listUsers({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        role: role as string,
        status: status as string
      });

      const response: ApiResponse = {
        success: true,
        data: result.users,
        pagination: result.pagination
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch users'
        }
      });
    }
  };

  // Other methods...
}
```

### Service Layer

```typescript
// services/user.service.ts
import { prisma } from '../config/database';
import { User, UserRole, UserStatus } from '../types/user.types';
import { PaginationOptions, PaginatedResult } from '../types/api.types';

export class UserService {
  async listUsers(options: {
    page: number;
    limit: number;
    search?: string;
    role?: UserRole;
    status?: UserStatus;
  }): Promise<PaginatedResult<User>> {
    const { page, limit, search, role, status } = options;
    const offset = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(role && { role }),
      ...(status && { status })
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: offset,
        take: limit,
        include: {
          company: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Other methods...
}
```

### Validation Schemas

```typescript
// schemas/user.schemas.ts
import { z } from 'zod';

export const userSchemas = {
  listUsers: z.object({
    query: z.object({
      page: z.string().optional().transform(Number),
      limit: z.string().optional().transform(Number),
      search: z.string().optional(),
      role: z.enum(['PLATFORM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']).optional(),
      status: z.enum(['active', 'suspended', 'pending']).optional()
    })
  }),

  getUser: z.object({
    params: z.object({
      userId: z.string().uuid()
    })
  }),

  updateUser: z.object({
    params: z.object({
      userId: z.string().uuid()
    }),
    body: z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      role: z.enum(['PLATFORM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']).optional(),
      status: z.enum(['active', 'suspended']).optional()
    })
  })
};
```

## Frontend Development

### Component Architecture

We follow a component-based architecture with clear separation of concerns:

```typescript
// components/platform-admin/UserManagementPanel.tsx
import React, { useState } from 'react';
import { useUsers } from '../../hooks/useUsers';
import { UserList } from './UserList';
import { UserFilters } from './UserFilters';
import { CreateUserModal } from './CreateUserModal';
import { Button } from '../ui/Button';

interface UserManagementPanelProps {
  className?: string;
}

export const UserManagementPanel: React.FC<UserManagementPanelProps> = ({ 
  className 
}) => {
  const [filters, setFilters] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const { 
    users, 
    loading, 
    error, 
    pagination, 
    refetch 
  } = useUsers(filters);

  const handleCreateUser = () => {
    setShowCreateModal(true);
  };

  const handleUserCreated = () => {
    setShowCreateModal(false);
    refetch();
  };

  if (error) {
    return <div className="error">Failed to load users</div>;
  }

  return (
    <div className={`user-management-panel ${className}`}>
      <div className="header">
        <h1>User Management</h1>
        <Button onClick={handleCreateUser}>
          Create User
        </Button>
      </div>

      <UserFilters 
        filters={filters}
        onFiltersChange={setFilters}
      />

      <UserList 
        users={users}
        loading={loading}
        pagination={pagination}
        onUserUpdate={refetch}
      />

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onUserCreated={handleUserCreated}
        />
      )}
    </div>
  );
};
```

### Custom Hooks

```typescript
// hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/user.service';
import { User, UserFilters } from '../types/user.types';

export const useUsers = (filters: UserFilters) => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => userService.listUsers(filters),
    keepPreviousData: true
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<User> }) =>
      userService.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
    }
  });

  const suspendUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      userService.suspendUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
    }
  });

  return {
    users: data?.users || [],
    pagination: data?.pagination,
    loading,
    error,
    refetch,
    updateUser: updateUserMutation.mutate,
    suspendUser: suspendUserMutation.mutate,
    isUpdating: updateUserMutation.isLoading || suspendUserMutation.isLoading
  };
};
```

### State Management

We use Zustand for global state management:

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types/user.types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        });
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData }
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
```

## Database Management

### Prisma Schema Management

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                   String              @id @default(uuid())
  email                String              @unique
  passwordHash         String
  role                 Role
  companyId            String
  firstName            String
  lastName             String
  phone                String
  emailVerified        Boolean             @default(false)
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt
  
  // Relations
  company              Company             @relation(fields: [companyId], references: [id])
  auditLogs            AuditLog[]
  
  // Indexes
  @@index([email])
  @@index([companyId])
  @@index([role])
}
```

### Migration Management

```bash
# Create new migration
npx prisma migrate dev --name add_security_models

# Apply migrations to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate
```

### Database Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create platform admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@vider.no',
      passwordHash: await hash('admin123', 12),
      role: 'PLATFORM_ADMIN',
      firstName: 'Platform',
      lastName: 'Admin',
      phone: '+47 123 45 678',
      emailVerified: true,
      company: {
        create: {
          name: 'Vider Platform',
          organizationNumber: '123456789',
          businessAddress: 'Platform Street 1',
          city: 'Oslo',
          postalCode: '0123',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
          verified: true,
          status: 'ACTIVE'
        }
      }
    }
  });

  console.log('Created platform admin:', adminUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## Security Implementation

### Authentication Middleware

```typescript
// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config/env';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    companyId: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token required'
        }
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        role: true,
        companyId: true,
        emailVerified: true
      }
    });

    if (!user || !user.emailVerified) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid token'
      }
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }
    next();
  };
};
```

### Audit Logging Middleware

```typescript
// middleware/audit-logging.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

interface AuditRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const auditLogMiddleware = (
  req: AuditRequest,
  res: Response,
  next: NextFunction
) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log the request after response is sent
    setImmediate(async () => {
      try {
        if (req.user && shouldLogRequest(req)) {
          await createAuditLog(req, res, data);
        }
      } catch (error) {
        console.error('Audit logging error:', error);
      }
    });
    
    return originalSend.call(this, data);
  };
  
  next();
};

function shouldLogRequest(req: Request): boolean {
  // Only log state-changing operations
  return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
}

async function createAuditLog(
  req: AuditRequest, 
  res: Response, 
  responseData: any
) {
  const action = getActionFromRequest(req);
  const entityInfo = getEntityFromRequest(req);
  
  await prisma.auditLog.create({
    data: {
      adminUserId: req.user!.id,
      action,
      entityType: entityInfo.type,
      entityId: entityInfo.id,
      changes: getChangesFromRequest(req, responseData),
      reason: req.body?.reason || null,
      ipAddress: req.ip,
      metadata: {
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode
      }
    }
  });
}
```

## Performance Optimization

### Database Optimization

1. **Indexing Strategy**
   ```sql
   -- Frequently queried fields
   CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
   CREATE INDEX CONCURRENTLY idx_users_role_status ON users(role, status);
   CREATE INDEX CONCURRENTLY idx_audit_logs_created_at ON audit_logs(created_at);
   
   -- Composite indexes for complex queries
   CREATE INDEX CONCURRENTLY idx_bookings_company_status_date 
   ON bookings(provider_company_id, status, created_at);
   ```

2. **Query Optimization**
   ```typescript
   // Use select to limit fields
   const users = await prisma.user.findMany({
     select: {
       id: true,
       email: true,
       firstName: true,
       lastName: true,
       role: true,
       company: {
         select: { id: true, name: true }
       }
     },
     where: { role: 'COMPANY_USER' },
     orderBy: { createdAt: 'desc' }
   });
   
   // Use pagination
   const result = await prisma.user.findMany({
     skip: (page - 1) * limit,
     take: limit
   });
   ```

3. **Connection Pooling**
   ```typescript
   // prisma/schema.prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   
   // Environment configuration
   DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=20&pool_timeout=20"
   ```

### Caching Strategy

```typescript
// services/cache.service.ts
import Redis from 'ioredis';
import { config } from '../config/env';

class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(config.REDIS_URL);
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

export const cacheService = new CacheService();

// Usage in service
export class AnalyticsService {
  async getPlatformMetrics(): Promise<PlatformMetrics> {
    const cacheKey = 'platform:metrics';
    
    let metrics = await cacheService.get<PlatformMetrics>(cacheKey);
    
    if (!metrics) {
      metrics = await this.calculatePlatformMetrics();
      await cacheService.set(cacheKey, metrics, 300); // 5 minutes
    }
    
    return metrics;
  }
}
```

### Frontend Performance

1. **Code Splitting**
   ```typescript
   // Lazy load components
   const UserManagement = lazy(() => import('./pages/UserManagement'));
   const Analytics = lazy(() => import('./pages/Analytics'));
   
   // Route-based code splitting
   const router = createBrowserRouter([
     {
       path: '/users',
       element: <Suspense fallback={<Loading />}><UserManagement /></Suspense>
     },
     {
       path: '/analytics',
       element: <Suspense fallback={<Loading />}><Analytics /></Suspense>
     }
   ]);
   ```

2. **Memoization**
   ```typescript
   // Memoize expensive calculations
   const ExpensiveComponent = memo(({ data }: { data: ComplexData }) => {
     const processedData = useMemo(() => {
       return processComplexData(data);
     }, [data]);
     
     return <div>{processedData}</div>;
   });
   
   // Memoize callbacks
   const UserList = ({ users, onUserUpdate }: UserListProps) => {
     const handleUserClick = useCallback((userId: string) => {
       onUserUpdate(userId);
     }, [onUserUpdate]);
     
     return (
       <div>
         {users.map(user => (
           <UserItem 
             key={user.id} 
             user={user} 
             onClick={handleUserClick} 
           />
         ))}
       </div>
     );
   };
   ```

3. **Virtual Scrolling**
   ```typescript
   // For large lists
   import { FixedSizeList as List } from 'react-window';
   
   const VirtualizedUserList = ({ users }: { users: User[] }) => {
     const Row = ({ index, style }: { index: number; style: any }) => (
       <div style={style}>
         <UserItem user={users[index]} />
       </div>
     );
     
     return (
       <List
         height={600}
         itemCount={users.length}
         itemSize={80}
         width="100%"
       >
         {Row}
       </List>
     );
   };
   ```

## Deployment Guide

### Environment Setup

#### Production Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL="postgresql://user:pass@prod-db:5432/vider_platform"
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL="redis://prod-redis:6379"

# Authentication
JWT_SECRET="your-production-jwt-secret"
JWT_EXPIRATION="24h"

# Security
ENABLE_HTTPS=true
CORS_ORIGINS="https://admin.vider.no,https://app.vider.no"
RATE_LIMIT_ENABLED=true

# Monitoring
SENTRY_DSN="your-sentry-dsn"
NEW_RELIC_LICENSE_KEY="your-newrelic-key"

# External Services
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"

# File Storage
STORAGE_TYPE="s3"
AWS_S3_BUCKET="vider-platform-files"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/vider_platform
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=vider_platform
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ghcr.io/vider/platform-admin:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            docker pull ghcr.io/vider/platform-admin:${{ github.sha }}
            docker stop platform-admin || true
            docker rm platform-admin || true
            docker run -d \
              --name platform-admin \
              --env-file /opt/platform-admin/.env \
              -p 3000:3000 \
              ghcr.io/vider/platform-admin:${{ github.sha }}
```

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check database connectivity
npx prisma db pull

# Reset database (development only)
npx prisma migrate reset

# Check connection pool
SELECT count(*) FROM pg_stat_activity WHERE datname = 'vider_platform';
```

#### Authentication Problems

```typescript
// Debug JWT token
import jwt from 'jsonwebtoken';

const token = 'your-jwt-token';
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Token valid:', decoded);
} catch (error) {
  console.log('Token invalid:', error.message);
}
```

#### Performance Issues

```bash
# Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

# Monitor Redis memory
redis-cli info memory

# Check Node.js memory usage
process.memoryUsage();
```

### Debugging Tools

1. **Logging**
   ```typescript
   import { logger } from '../config/logger';
   
   logger.debug('Debug information', { userId, action });
   logger.info('User action completed', { userId, action });
   logger.warn('Potential issue detected', { issue });
   logger.error('Error occurred', { error: error.message, stack: error.stack });
   ```

2. **Database Query Logging**
   ```typescript
   // Enable in development
   const prisma = new PrismaClient({
     log: ['query', 'info', 'warn', 'error'],
   });
   ```

3. **API Request Logging**
   ```typescript
   app.use((req, res, next) => {
     console.log(`${req.method} ${req.path}`, {
       body: req.body,
       query: req.query,
       headers: req.headers
     });
     next();
   });
   ```

### Support Resources

- **Documentation**: [Internal Wiki](https://wiki.vider.no/platform-admin)
- **Issue Tracking**: [GitHub Issues](https://github.com/vider/platform-admin/issues)
- **Team Chat**: #platform-admin-dev Slack channel
- **Code Reviews**: GitHub Pull Requests
- **Monitoring**: [Grafana Dashboard](https://monitoring.vider.no/platform-admin)

For additional support, contact the development team at dev-team@vider.no.