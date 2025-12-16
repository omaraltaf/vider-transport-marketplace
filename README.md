# Vider Transport Marketplace

Vider (meaning "Further" / "Onward") is a production-ready, peer-to-peer marketplace platform designed for the Norwegian B2B transport and logistics market.

## Features

- **Vehicle & Driver Rentals**: Transport companies can rent vehicles and drivers to one another
- **Contract Management**: Automated contract generation and booking lifecycle management
- **Transparent Invoicing**: Clear pricing breakdown with commission and tax calculations
- **Trust & Ratings**: Comprehensive ratings system for companies and drivers
- **GDPR Compliant**: Full data export and deletion capabilities
- **Role-Based Access**: Platform Admin, Company Admin, and Company User roles

## Tech Stack

### Backend
- **Runtime**: Node.js v20+
- **Framework**: Express.js
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **Validation**: Zod
- **Testing**: Vitest + fast-check (property-based testing)

### Infrastructure
- **Logging**: Winston
- **Rate Limiting**: express-rate-limit
- **API Documentation**: OpenAPI 3.0

## Getting Started

### Prerequisites

- Node.js v20 or higher
- PostgreSQL 15 or higher
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment example file:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your configuration:
   - Set `DATABASE_URL` to your PostgreSQL connection string
   - Generate a strong `JWT_SECRET` (minimum 32 characters)
   - Configure SMTP settings for email notifications
   - Adjust platform settings (commission rate, tax rate, etc.)

5. Set up the database:
   ```bash
   ./scripts/setup-db.sh
   ```
   
   Or follow the [detailed database setup guide](docs/DATABASE_SETUP.md) for manual setup.

### Development

Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Testing

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

### Building for Production

Build the TypeScript code:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Project Structure

```
vider-transport-marketplace/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/                # Configuration and environment setup
│   │   ├── env.ts            # Environment variable validation
│   │   ├── database.ts       # Database connection
│   │   └── logger.ts         # Logging configuration
│   ├── middleware/            # Express middleware
│   ├── models/                # Data models and types
│   ├── routes/                # API route handlers
│   ├── services/              # Business logic layer
│   ├── app.ts                 # Express app setup
│   └── index.ts               # Application entry point
├── .env.example               # Environment variables template
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Environment Variables

See `.env.example` for all required environment variables. Key variables include:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing (min 32 chars)
- `SMTP_*`: Email configuration for notifications
- `PLATFORM_COMMISSION_RATE`: Commission percentage (e.g., 5 for 5%)
- `PLATFORM_TAX_RATE`: Tax percentage (e.g., 25 for 25%)
- `BOOKING_TIMEOUT_HOURS`: Hours before pending bookings expire

## API Documentation

Once the server is running, API documentation will be available at:
- Swagger UI: `http://localhost:3000/api-docs` (coming soon)

## Database Management

### Migrations

Create a new migration:
```bash
npm run migrate
```

Deploy migrations to production:
```bash
npm run migrate:deploy
```

### Prisma Studio

Open Prisma Studio to view and edit data:
```bash
npm run db:studio
```

## Testing Strategy

The project uses a comprehensive testing approach:

1. **Property-Based Testing**: Using fast-check to verify universal properties across many inputs
2. **Unit Testing**: Testing individual components and functions
3. **Integration Testing**: Testing API endpoints and database operations

All property tests are tagged with their corresponding design document property number.

## Production Deployment 🚀

### Quick Deployment to Railway (Recommended)

1. **Prepare for deployment**:
   ```bash
   git add .
   git commit -m "feat: production deployment ready"
   git push origin main
   ```

2. **Deploy using the automated script**:
   ```bash
   ./scripts/deploy-production.sh
   ```

3. **Or deploy manually**:
   ```bash
   git checkout production
   git merge main
   git push origin production
   ```

### Environment Setup for Production

1. **Configure environment variables** in your deployment platform:
   - Copy values from `.env.production` template
   - Generate strong JWT secrets: `openssl rand -base64 32`
   - Configure SMTP for email notifications
   - Set up database connection string

2. **Database setup**:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

### Alternative Deployment Options

- **Railway**: Automatic deployment from Git (recommended)
- **Vercel + PlanetScale**: Serverless with managed database
- **DigitalOcean**: App Platform with managed database
- **AWS**: Full control with ECS/Lambda + RDS
- **Docker**: Use included `Dockerfile` and `docker-compose.yml`

### Post-Deployment Verification

```bash
# Check application health
curl https://your-domain.com/health

# Test authentication
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

### Production Features ✅

- **User Management**: Complete user creation, authentication, and password management
- **Admin Dashboard**: Full platform administration interface
- **Security**: JWT authentication, rate limiting, input validation
- **Database**: Production-ready PostgreSQL with migrations
- **Monitoring**: Health checks, logging, error tracking
- **Testing**: Comprehensive test suite with property-based testing
- **Documentation**: Complete API and deployment documentation

**Status**: Production Ready - All core functionality implemented and tested

For detailed deployment instructions, see:
- [Production Deployment Plan](PRODUCTION_DEPLOYMENT_PLAN.md)
- [Git Workflow](GIT_WORKFLOW.md)

## License

ISC
