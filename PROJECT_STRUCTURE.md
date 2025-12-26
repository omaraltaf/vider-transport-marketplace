# Project Structure

This document provides a comprehensive overview of the Vider Platform project structure.

## 📁 Root Directory Structure

```
vider-platform/
├── 📁 .github/                    # GitHub workflows and templates
├── 📁 .kiro/                      # Kiro IDE configuration
├── 📁 .vscode/                    # VS Code configuration
├── 📁 dist/                       # Compiled JavaScript output
├── 📁 docs/                       # Additional documentation
├── 📁 frontend/                   # React frontend application
├── 📁 logs/                       # Application logs (created at runtime)
├── 📁 node_modules/               # Node.js dependencies
├── 📁 prisma/                     # Database schema and migrations
├── 📁 scripts/                    # Utility and deployment scripts
├── 📁 src/                        # Backend source code
├── 📁 uploads/                    # File upload storage (created at runtime)
├── 📄 .env                        # Environment variables (not in git)
├── 📄 .env.example                # Environment variables template
├── 📄 .env.production             # Production environment template
├── 📄 .eslintrc.json              # ESLint configuration
├── 📄 .gitignore                  # Git ignore rules
├── 📄 API_DOCUMENTATION.md        # API documentation
├── 📄 Dockerfile                  # Docker container configuration
├── 📄 docker-compose.yml          # Docker Compose configuration
├── 📄 ecosystem.config.js         # PM2 process manager configuration
├── 📄 package.json                # Node.js dependencies and scripts
├── 📄 package-lock.json           # Locked dependency versions
├── 📄 PRODUCTION_CHECKLIST.md     # Production deployment checklist
├── 📄 PRODUCTION_DEPLOYMENT_GUIDE.md # Deployment guide
├── 📄 railway.json                # Railway deployment configuration
├── 📄 README.md                   # Main project documentation
├── 📄 SECURITY_GUIDE.md           # Security documentation
├── 📄 TEST_ACCOUNTS.md            # Test account information
├── 📄 tsconfig.json               # TypeScript configuration
├── 📄 tsconfig.production.json    # Production TypeScript configuration
└── 📄 vitest.config.ts            # Test configuration
```

## 🔧 Backend Structure (`/src`)

```
src/
├── 📁 config/                     # Configuration and setup
│   ├── 📄 database.ts             # Database connection (Prisma)
│   ├── 📄 email.ts                # Email service configuration
│   ├── 📄 logger.ts               # Winston logging configuration
│   └── 📄 redis.ts                # Redis cache configuration
├── 📁 controllers/                # Request handlers (if using MVC pattern)
├── 📁 middleware/                 # Express middleware
│   ├── 📄 auth.middleware.ts      # JWT authentication
│   ├── 📄 cors.middleware.ts      # CORS configuration
│   ├── 📄 error.middleware.ts     # Error handling
│   ├── 📄 logging.middleware.ts   # Request logging
│   ├── 📄 rate-limit.middleware.ts # Rate limiting
│   ├── 📄 security.middleware.ts  # Security headers
│   └── 📄 validation.middleware.ts # Input validation
├── 📁 routes/                     # API route definitions
│   ├── 📄 auth.routes.ts          # Authentication endpoints
│   ├── 📄 availability.routes.ts  # Availability management
│   ├── 📄 booking.routes.ts       # Booking management
│   ├── 📄 company.routes.ts       # Company management
│   ├── 📄 listing.routes.ts       # Vehicle/driver listings
│   ├── 📄 message.routes.ts       # Messaging system
│   ├── 📄 notification.routes.ts  # Notifications
│   ├── 📄 platform-admin.routes.ts # Platform administration
│   ├── 📄 rating.routes.ts        # Rating and review system
│   ├── 📄 upload.routes.ts        # File upload handling
│   └── 📄 user.routes.ts          # User management
├── 📁 services/                   # Business logic layer
│   ├── 📄 auth.service.ts         # Authentication logic
│   ├── 📄 availability.service.ts # Availability management
│   ├── 📄 booking.service.ts      # Booking business logic
│   ├── 📄 company.service.ts      # Company operations
│   ├── 📄 email.service.ts        # Email sending
│   ├── 📄 listing.service.ts      # Listing management
│   ├── 📄 message.service.ts      # Messaging logic
│   ├── 📄 notification.service.ts # Notification handling
│   ├── 📄 payment.service.ts      # Payment processing
│   ├── 📄 rating.service.ts       # Rating calculations
│   ├── 📄 search.service.ts       # Search functionality
│   └── 📄 user.service.ts         # User operations
├── 📁 types/                      # TypeScript type definitions
│   ├── 📄 auth.types.ts           # Authentication types
│   ├── 📄 booking.types.ts        # Booking-related types
│   ├── 📄 common.types.ts         # Common/shared types
│   ├── 📄 express.d.ts            # Express type extensions
│   └── 📄 user.types.ts           # User-related types
├── 📁 utils/                      # Utility functions
│   ├── 📄 constants.ts            # Application constants
│   ├── 📄 date.utils.ts           # Date manipulation utilities
│   ├── 📄 email.utils.ts          # Email formatting utilities
│   ├── 📄 encryption.utils.ts     # Encryption/hashing utilities
│   ├── 📄 error.utils.ts          # Error handling utilities
│   ├── 📄 file.utils.ts           # File handling utilities
│   ├── 📄 logging.utils.ts        # Logging utilities
│   ├── 📄 pagination.utils.ts     # Pagination helpers
│   ├── 📄 search-testing-utilities.ts # Search testing helpers
│   ├── 📄 test-data-generators.ts # Test data generation
│   └── 📄 validation.utils.ts     # Input validation utilities
├── 📁 validators/                 # Input validation schemas
│   ├── 📄 auth.validators.ts      # Authentication validation
│   ├── 📄 booking.validators.ts   # Booking validation
│   ├── 📄 company.validators.ts   # Company validation
│   └── 📄 listing.validators.ts   # Listing validation
├── 📄 app.ts                      # Express application setup
└── 📄 index.ts                    # Application entry point
```

## 🎨 Frontend Structure (`/frontend`)

```
frontend/
├── 📁 public/                     # Static assets
│   ├── 📄 favicon.ico             # Favicon
│   ├── 📄 index.html              # HTML template
│   └── 📄 manifest.json           # PWA manifest
├── 📁 src/                        # Frontend source code
│   ├── 📁 components/             # React components
│   │   ├── 📁 auth/               # Authentication components
│   │   ├── 📁 availability/       # Availability management
│   │   ├── 📁 booking/            # Booking components
│   │   ├── 📁 common/             # Shared components
│   │   ├── 📁 company/            # Company management
│   │   ├── 📁 layout/             # Layout components
│   │   ├── 📁 listing/            # Listing components
│   │   ├── 📁 messaging/          # Messaging components
│   │   ├── 📁 platform-admin/     # Admin components
│   │   └── 📁 ui/                 # UI components
│   ├── 📁 hooks/                  # Custom React hooks
│   ├── 📁 pages/                  # Page components
│   ├── 📁 services/               # API service layer
│   ├── 📁 styles/                 # CSS and styling
│   ├── 📁 types/                  # TypeScript types
│   ├── 📁 utils/                  # Utility functions
│   ├── 📄 App.tsx                 # Main App component
│   ├── 📄 index.tsx               # React entry point
│   └── 📄 vite-env.d.ts           # Vite type definitions
├── 📄 package.json                # Frontend dependencies
├── 📄 tailwind.config.js          # Tailwind CSS configuration
├── 📄 tsconfig.json               # TypeScript configuration
└── 📄 vite.config.ts              # Vite build configuration
```

## 🗄️ Database Structure (`/prisma`)

```
prisma/
├── 📁 migrations/                 # Database migration files
│   ├── 📁 20231201000000_init/    # Initial migration
│   ├── 📁 20231202000000_users/   # User-related changes
│   └── 📁 ...                     # Additional migrations
├── 📄 schema.prisma               # Database schema definition
└── 📄 seed.ts                     # Database seeding script
```

## 🔧 Scripts Directory (`/scripts`)

```
scripts/
├── 📄 comprehensive-seed.ts       # Development data seeding
├── 📄 seed-production.ts          # Production data seeding
├── 📄 test-search-functionality-e2e.ts # Search testing
└── 📄 ...                         # Additional utility scripts
```

## 📚 Documentation (`/docs`)

```
docs/
├── 📁 api/                        # API documentation
├── 📁 deployment/                 # Deployment guides
├── 📁 development/                # Development guides
└── 📁 user/                       # User documentation
```

## 🔧 Configuration Files

### TypeScript Configuration
- **`tsconfig.json`**: Development TypeScript configuration
- **`tsconfig.production.json`**: Production-optimized configuration

### Build & Development
- **`package.json`**: Dependencies and scripts
- **`vite.config.ts`**: Frontend build configuration
- **`vitest.config.ts`**: Test configuration
- **`.eslintrc.json`**: Code linting rules

### Deployment
- **`Dockerfile`**: Container configuration
- **`docker-compose.yml`**: Multi-container setup
- **`ecosystem.config.js`**: PM2 process management
- **`railway.json`**: Railway deployment configuration

### Environment
- **`.env.example`**: Environment variables template
- **`.env.production`**: Production environment template
- **`.gitignore`**: Git ignore patterns

## 🏗️ Architecture Patterns

### Backend Architecture
- **Layered Architecture**: Routes → Services → Database
- **Dependency Injection**: Services injected into routes
- **Middleware Pattern**: Express middleware for cross-cutting concerns
- **Repository Pattern**: Data access abstraction (via Prisma)

### Frontend Architecture
- **Component-Based**: Reusable React components
- **Custom Hooks**: Shared logic extraction
- **Service Layer**: API communication abstraction
- **State Management**: React Query for server state

### Database Design
- **Normalized Schema**: Proper relational design
- **Audit Logging**: Change tracking for sensitive operations
- **Soft Deletes**: Preserve data integrity
- **Indexing**: Optimized query performance

## 📦 Key Dependencies

### Backend Core
- **Express.js**: Web framework
- **Prisma**: Database ORM
- **TypeScript**: Type safety
- **Winston**: Logging
- **JWT**: Authentication

### Frontend Core
- **React**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **React Query**: State management

### Development Tools
- **Vitest**: Testing framework
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Fast-check**: Property-based testing

## 🔍 File Naming Conventions

### Backend Files
- **Routes**: `*.routes.ts` (e.g., `auth.routes.ts`)
- **Services**: `*.service.ts` (e.g., `user.service.ts`)
- **Middleware**: `*.middleware.ts` (e.g., `auth.middleware.ts`)
- **Types**: `*.types.ts` (e.g., `user.types.ts`)
- **Utils**: `*.utils.ts` (e.g., `date.utils.ts`)
- **Validators**: `*.validators.ts` (e.g., `auth.validators.ts`)

### Frontend Files
- **Components**: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- **Pages**: `PascalCase.tsx` (e.g., `LoginPage.tsx`)
- **Hooks**: `use*.ts` (e.g., `useAuth.ts`)
- **Services**: `*.service.ts` (e.g., `api.service.ts`)
- **Types**: `*.types.ts` (e.g., `user.types.ts`)

### Test Files
- **Unit Tests**: `*.test.ts` (e.g., `user.service.test.ts`)
- **Integration Tests**: `*.integration.test.ts`
- **E2E Tests**: `*.e2e.test.ts`

## 🚀 Build Output

### Development
- **Backend**: TypeScript files run directly with `tsx`
- **Frontend**: Vite dev server with hot reload
- **Database**: Development database with migrations

### Production
- **Backend**: Compiled to `dist/` directory
- **Frontend**: Built to `frontend/dist/` directory
- **Database**: Production database with deployed migrations

---

This structure provides a scalable, maintainable foundation for the Vider Platform with clear separation of concerns and consistent organization patterns.