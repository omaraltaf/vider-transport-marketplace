# Platform Admin Configuration Guide

## Overview

This guide covers the configuration and customization options available in the Platform Admin Dashboard. Proper configuration ensures optimal performance, security, and user experience.

## Environment Configuration

### Production Environment

```bash
# Core Application Settings
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
API_VERSION=v1

# Database Configuration
DATABASE_URL="postgresql://user:pass@host:5432/vider_platform"
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# Redis Configuration
REDIS_URL="redis://host:6379"
REDIS_PASSWORD="your-redis-password"
REDIS_DB=0

# Authentication & Security
JWT_SECRET="your-secure-jwt-secret"
JWT_EXPIRATION="24h"
MFA_REQUIRED=true
SESSION_TIMEOUT="30m"
PASSWORD_MIN_LENGTH=12

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW="15m"
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL=false

# Security Headers
ENABLE_HSTS=true
ENABLE_CSP=true
ENABLE_FRAME_OPTIONS=true
ENABLE_XSS_PROTECTION=true

# CORS Configuration
CORS_ORIGINS="https://admin.vider.no,https://app.vider.no"
CORS_CREDENTIALS=true

# File Upload & Storage
MAX_FILE_SIZE="10MB"
ALLOWED_FILE_TYPES="pdf,jpg,jpeg,png,doc,docx"
STORAGE_TYPE="s3"
AWS_S3_BUCKET="vider-platform-files"
AWS_REGION="eu-west-1"

# Email Configuration
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
FROM_EMAIL="noreply@vider.no"
FROM_NAME="Vider Platform"

# Monitoring & Logging
SENTRY_DSN="your-sentry-dsn"
NEW_RELIC_LICENSE_KEY="your-newrelic-key"
LOG_RETENTION_DAYS=90
AUDIT_LOG_RETENTION_DAYS=2555

# Feature Flags
ENABLE_ADVANCED_ANALYTICS=true
ENABLE_REAL_TIME_MONITORING=true
ENABLE_AUTOMATED_MODERATION=true
ENABLE_FRAUD_DETECTION=true
ENABLE_BULK_OPERATIONS=true

# External Services
PAYMENT_GATEWAY_URL="https://api.stripe.com"
PAYMENT_WEBHOOK_SECRET="your-webhook-secret"
MAPS_API_KEY="your-google-maps-key"
ANALYTICS_TRACKING_ID="your-ga-tracking-id"
```

## Database Configuration

### Connection Settings

```typescript
// config/database.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Connection pool configuration
const connectionString = new URL(process.env.DATABASE_URL);
connectionString.searchParams.set('connection_limit', '20');
connectionString.searchParams.set('pool_timeout', '20');
connectionString.searchParams.set('statement_timeout', '30000');
```

### Performance Optimization

```sql
-- Recommended PostgreSQL settings
-- postgresql.conf

# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection settings
max_connections = 100
max_prepared_transactions = 100

# Performance settings
random_page_cost = 1.1
effective_io_concurrency = 200
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Logging
log_statement = 'mod'
log_duration = on
log_min_duration_statement = 1000
```

## Security Configuration

### Authentication Settings

```typescript
// config/auth.ts
export const authConfig = {
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION || '24h',
    algorithm: 'HS256' as const,
  },
  mfa: {
    required: process.env.MFA_REQUIRED === 'true',
    issuer: 'Vider Platform',
    window: 1,
  },
  session: {
    timeout: process.env.SESSION_TIMEOUT || '30m',
    rolling: true,
  },
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '12'),
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
  },
};
```

### Rate Limiting Configuration

```typescript
// config/rateLimiting.ts
export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  keyGenerator: (req) => {
    // Use user ID for authenticated requests
    return req.user?.id || req.ip;
  },
};
```

## Feature Configuration

### Analytics Configuration

```typescript
// config/analytics.ts
export const analyticsConfig = {
  realTimeUpdates: process.env.ENABLE_REAL_TIME_MONITORING === 'true',
  cacheTimeout: 300, // 5 minutes
  maxDataPoints: 1000,
  aggregationLevels: ['hour', 'day', 'week', 'month'],
  retentionPeriods: {
    raw: 90, // days
    hourly: 365, // days
    daily: 1095, // 3 years
    monthly: 3650, // 10 years
  },
};
```

### Content Moderation Configuration

```typescript
// config/moderation.ts
export const moderationConfig = {
  autoModeration: process.env.ENABLE_AUTOMATED_MODERATION === 'true',
  reviewQueueSize: 50,
  escalationThreshold: 3,
  flaggedContentRetention: 30, // days
  moderatorAssignment: 'round-robin',
  workingHours: {
    start: '08:00',
    end: '18:00',
    timezone: 'Europe/Oslo',
  },
};
```

### Security Monitoring Configuration

```typescript
// config/security.ts
export const securityConfig = {
  monitoring: {
    enabled: process.env.ENABLE_SECURITY_MONITORING === 'true',
    alertThresholds: {
      failedLogins: 5,
      suspiciousActivity: 3,
      dataAccess: 100,
    },
    retentionPeriod: 365, // days
  },
  alerts: {
    emailNotifications: true,
    slackIntegration: process.env.SLACK_WEBHOOK_URL ? true : false,
    escalationLevels: ['low', 'medium', 'high', 'critical'],
  },
  auditLog: {
    retentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '2555'),
    compressionEnabled: true,
    encryptionEnabled: true,
  },
};
```

## Performance Configuration

### Caching Configuration

```typescript
// config/cache.ts
import Redis from 'ioredis';

export const cacheConfig = {
  redis: new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  }),
  ttl: {
    default: 300, // 5 minutes
    analytics: 600, // 10 minutes
    userSessions: 1800, // 30 minutes
    configuration: 3600, // 1 hour
  },
};
```

### File Upload Configuration

```typescript
// config/upload.ts
export const uploadConfig = {
  maxFileSize: process.env.MAX_FILE_SIZE || '10MB',
  allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,jpg,jpeg,png').split(','),
  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    local: {
      path: './uploads',
    },
    s3: {
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION || 'eu-west-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  },
  virus: {
    scanning: process.env.ENABLE_VIRUS_SCANNING === 'true',
    quarantine: true,
  },
};
```

## Monitoring Configuration

### Health Check Configuration

```typescript
// config/health.ts
export const healthConfig = {
  checks: {
    database: {
      enabled: true,
      timeout: 5000,
      query: 'SELECT 1',
    },
    redis: {
      enabled: true,
      timeout: 3000,
    },
    external: {
      enabled: true,
      services: [
        {
          name: 'payment-gateway',
          url: process.env.PAYMENT_GATEWAY_URL + '/health',
          timeout: 5000,
        },
      ],
    },
  },
  intervals: {
    detailed: 30000, // 30 seconds
    summary: 300000, // 5 minutes
  },
};
```

### Logging Configuration

```typescript
// config/logger.ts
import winston from 'winston';

export const loggerConfig = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'platform-admin',
    version: process.env.npm_package_version,
  },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  loggerConfig.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

## Deployment Configuration

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Production dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build application
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
```

### Nginx Configuration

```nginx
# nginx.conf
upstream platform_admin {
    server app:3000;
}

server {
    listen 80;
    server_name admin.vider.no;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.vider.no;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://platform_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    location /health {
        proxy_pass http://platform_admin;
        access_log off;
    }
}
```

## Backup Configuration

### Database Backup

```bash
#!/bin/bash
# backup-database.sh

DB_NAME="vider_platform"
BACKUP_DIR="/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
if [ ! -z "$AWS_S3_BACKUP_BUCKET" ]; then
    aws s3 cp "${BACKUP_FILE}.gz" "s3://${AWS_S3_BACKUP_BUCKET}/database/"
fi
```

### File Backup

```bash
#!/bin/bash
# backup-files.sh

SOURCE_DIR="/app/uploads"
BACKUP_DIR="/backups/files"
DATE=$(date +%Y%m%d_%H%M%S)

# Create incremental backup
rsync -av --link-dest="${BACKUP_DIR}/latest" \
      "$SOURCE_DIR/" \
      "${BACKUP_DIR}/${DATE}/"

# Update latest symlink
rm -f "${BACKUP_DIR}/latest"
ln -s "${DATE}" "${BACKUP_DIR}/latest"

# Remove backups older than 90 days
find $BACKUP_DIR -maxdepth 1 -type d -mtime +90 -exec rm -rf {} \;
```

## Maintenance Configuration

### Scheduled Tasks

```yaml
# crontab configuration
# Database backup daily at 2 AM
0 2 * * * /scripts/backup-database.sh

# File backup daily at 3 AM
0 3 * * * /scripts/backup-files.sh

# Log rotation weekly
0 0 * * 0 /usr/sbin/logrotate /etc/logrotate.conf

# Security scan weekly
0 1 * * 1 /scripts/security-scan.sh

# Performance report monthly
0 0 1 * * /scripts/performance-report.sh
```

### Maintenance Mode

```typescript
// middleware/maintenance.middleware.ts
export const maintenanceMode = (req: Request, res: Response, next: NextFunction) => {
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  const isHealthCheck = req.path === '/health';
  const isAdmin = req.user?.role === 'PLATFORM_ADMIN';

  if (isMaintenanceMode && !isHealthCheck && !isAdmin) {
    return res.status(503).json({
      error: {
        code: 'MAINTENANCE_MODE',
        message: 'System is currently under maintenance. Please try again later.',
        estimatedCompletion: process.env.MAINTENANCE_END_TIME,
      },
    });
  }

  next();
};
```

This configuration guide provides the foundation for properly setting up and maintaining the Platform Admin Dashboard in various environments.