import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { logger } from './config/logger';
import { HealthService } from './services/health.service';
import { logError } from './utils/logging.utils';
import { openApiSpec } from './openapi/spec';
import { blockInMaintenanceMode } from './middleware/feature-toggle.middleware';

export function createApp(): Application {
  const app = express();
  const healthService = new HealthService();

  // Middleware
  const allowedOrigins = [
    'https://vider-transport-marketplace.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
  ];
  
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    next();
  });

  // Maintenance mode check (allow platform admins to bypass)
  app.use(blockInMaintenanceMode({ 
    allowedRoles: ['PLATFORM_ADMIN'] 
  }));

  // Health check endpoint with dependency status
  app.get('/health', async (req: Request, res: Response) => {
    try {
      const healthStatus = await healthService.checkHealth();
      
      if (healthStatus.status === 'healthy') {
        res.status(200).json(healthStatus);
      } else {
        res.status(503).json(healthStatus);
      }
    } catch (error) {
      logError({
        error: error instanceof Error ? error : new Error('Unknown error in health check'),
        request: req,
      });
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  });

  // Swagger UI for API documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'Vider API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  }));

  // OpenAPI spec JSON endpoint
  app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openApiSpec);
  });

  // API routes
  const authRoutes = require('./routes/auth.routes').default;
  app.use('/api/auth', authRoutes);
  
  const companyRoutes = require('./routes/company.routes').default;
  app.use('/api/companies', companyRoutes);
  
  const listingRoutes = require('./routes/listing.routes').default;
  app.use('/api/listings', listingRoutes);
  
  const bookingRoutes = require('./routes/booking.routes').default;
  app.use('/api/bookings', bookingRoutes);
  
  const paymentRoutes = require('./routes/payment.routes').default;
  app.use('/api/payments', paymentRoutes);
  
  const ratingRoutes = require('./routes/rating.routes').default;
  app.use('/api/ratings', ratingRoutes);
  
  const messagingRoutes = require('./routes/messaging.routes').default;
  app.use('/api/messages', messagingRoutes);
  
  const notificationRoutes = require('./routes/notification.routes').default;
  app.use('/api/notifications', notificationRoutes);
  
  const adminRoutes = require('./routes/admin.routes').default;
  app.use('/api/admin', adminRoutes);
  
  const platformAdminRoutes = require('./routes/platform-admin.routes').default;
  app.use('/api/platform-admin', platformAdminRoutes);
  
  const securityMonitoringRoutes = require('./routes/security-monitoring.routes').default;
  app.use('/api/platform-admin/security', securityMonitoringRoutes);
  
  const financialRoutes = require('./routes/financial.routes').default;
  app.use('/api/platform-admin/financial', financialRoutes);
  
  const userManagementRoutes = require('./routes/user-management.routes').default;
  app.use('/api/platform-admin/users', userManagementRoutes);
  
  const companyManagementRoutes = require('./routes/company-management.routes').default;
  app.use('/api/platform-admin/companies', companyManagementRoutes);
  
  const analyticsRoutes = require('./routes/analytics.routes').default;
  app.use('/api/platform-admin/analytics', analyticsRoutes);
  
  const auditLogRoutes = require('./routes/audit-log.routes').default;
  app.use('/api/audit-logs', auditLogRoutes);
  
  const communicationRoutes = require('./routes/communication.routes').default;
  app.use('/api/platform-admin/communication', communicationRoutes);
  
  const contentModerationRoutes = require('./routes/content-moderation.routes').default;
  app.use('/api/platform-admin/moderation', contentModerationRoutes);
  
  const systemAdminRoutes = require('./routes/system-admin.routes').default;
  app.use('/api/platform-admin/system', systemAdminRoutes);
  
  const platformAdminGlobalRoutes = require('./routes/platform-admin-global.routes').default;
  app.use('/api/platform-admin', platformAdminGlobalRoutes);
  
  const gdprRoutes = require('./routes/gdpr.routes').default;
  app.use('/api/gdpr', gdprRoutes);
  
  const dashboardRoutes = require('./routes/dashboard.routes').default;
  app.use('/api/dashboard', dashboardRoutes);
  
  const availabilityRoutes = require('./routes/availability.routes').default;
  app.use('/api/availability', availabilityRoutes);
  
  const seedRoutes = require('./routes/seed.routes').default;
  app.use('/api/seed', seedRoutes);
  
  const userRoutes = require('./routes/user.routes').default;
  app.use('/api/user', userRoutes);
  
  const debugRoutes = require('./routes/debug.routes').default;
  app.use('/api/debug', debugRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'The requested route does not exist',
      },
    });
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: Function) => {
    // Log error with full context
    logError({
      error: err,
      request: req,
      additionalContext: {
        body: req.body,
        params: req.params,
      },
    });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: config.NODE_ENV === 'production' 
          ? 'An internal error occurred' 
          : err.message,
      },
    });
  });

  return app;
}
