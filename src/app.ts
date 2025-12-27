/**
 * Vider Transport Marketplace API
 * Build: 2025-12-17T17:35:00Z - Entry Point Fix (dist/index.js)
 */
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { logger } from './config/logger';
import { HealthService } from './services/health.service';
import { logError } from './utils/logging.utils';
import { openApiSpec } from './openapi/spec';
import { blockInMaintenanceMode } from './middleware/feature-toggle.middleware';

// Route imports
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import listingRoutes from './routes/listing.routes';
import bookingRoutes from './routes/booking.routes';
import paymentRoutes from './routes/payment.routes';
import ratingRoutes from './routes/rating.routes';
import messagingRoutes from './routes/messaging.routes';
import notificationRoutes from './routes/notification.routes';
import adminRoutes from './routes/admin.routes';
import platformAdminRoutes from './routes/platform-admin.routes';
import securityMonitoringRoutes from './routes/security-monitoring.routes';
import financialRoutes from './routes/financial.routes';
import userManagementRoutes from './routes/user-management.routes';
import companyManagementRoutes from './routes/company-management.routes';
import analyticsRoutes from './routes/analytics.routes';
import auditLogRoutes from './routes/audit-log.routes';
import communicationRoutes from './routes/communication.routes';
import contentModerationRoutes from './routes/content-moderation.routes';
import systemAdminRoutes from './routes/system-admin.routes';
import platformConfigRoutes from './routes/platform-config.routes';
import userRoutes from './routes/user.routes';
import availabilityRoutes from './routes/availability.routes';
import listingAnalyticsRoutes from './routes/listing-analytics.routes';
import seedRoutes from './routes/seed.routes';
import adminSetupRoutes from './routes/admin-setup.routes';
import debugRoutes from './routes/debug.routes';

export function createApp(): Application {
  const app = express();
  const healthService = new HealthService();

  // Middleware
  const allowedOrigins = [
    'https://vider-transport-marketplace.vercel.app',
    'https://vider-transport-marketplace-production.up.railway.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    // Allow any Vercel deployment URLs
    /^https:\/\/.*\.vercel\.app$/,
    // Allow Railway URLs
    /^https:\/\/.*\.railway\.app$/,
    /^https:\/\/.*\.up\.railway\.app$/,
  ];
  
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check string origins
      if (typeof origin === 'string' && allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === origin;
        } else if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      })) {
        callback(null, true);
      } else {
        console.log(`CORS blocked origin: ${origin}`);
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
  // TEMPORARILY DISABLED DUE TO PLATFORM CONFIG SERVICE ISSUES
  // app.use(blockInMaintenanceMode({ 
  //   allowedRoles: ['PLATFORM_ADMIN'] 
  // }));

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

  // API root endpoint
  app.get('/api', (_req: Request, res: Response) => {
    res.json({
      name: 'Vider Transport Marketplace API',
      version: '1.0.0',
      status: 'operational',
      timestamp: new Date().toISOString(),
      deploymentVersion: '2025-12-17-entry-point-fix',
      documentation: '/api-docs',
      endpoints: {
        auth: '/api/auth',
        companies: '/api/companies',
        listings: '/api/listings',
        bookings: '/api/bookings',
        payments: '/api/payments',
        ratings: '/api/ratings',
        messages: '/api/messages',
        notifications: '/api/notifications',
        admin: '/api/admin',
        platformAdmin: '/api/platform-admin',
        health: '/health'
      }
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/listings', listingRoutes);
  app.use('/api/listings/analytics', listingAnalyticsRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/ratings', ratingRoutes);
  app.use('/api/messages', messagingRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/availability', availabilityRoutes);
  app.use('/api/seed', seedRoutes);
  app.use('/api/admin-setup', adminSetupRoutes);
  app.use('/api/debug', debugRoutes);
  
  // Debug routes for platform admin (temporary fix) - MOUNT FIRST, NO AUTH
  try {
    const platformAdminDebugRoutes = require('./routes/platform-admin-debug.routes').default;
    app.use('/api/platform-admin', platformAdminDebugRoutes);
  } catch (error) {
    console.warn('Platform admin debug routes not available:', error.message);
  }
  
  // Platform Admin routes (mount in specific order to avoid conflicts)
  app.use('/api/platform-admin/security', securityMonitoringRoutes);
  app.use('/api/platform-admin/financial', financialRoutes);
  app.use('/api/platform-admin/users', userManagementRoutes);
  app.use('/api/platform-admin/companies', companyManagementRoutes);
  app.use('/api/platform-admin/analytics', analyticsRoutes);
  app.use('/api/platform-admin/communication', communicationRoutes);
  app.use('/api/platform-admin/moderation', contentModerationRoutes);
  app.use('/api/platform-admin/config', platformConfigRoutes);
  
  try {
    const systemAdminRoutes = require('./routes/system-admin.routes').default;
    app.use('/api/platform-admin/system', systemAdminRoutes);
  } catch (error) {
    console.warn('System admin routes not available:', error.message);
  }
  
  // Main platform admin routes (mount after specific sub-routes)
  app.use('/api/platform-admin', platformAdminRoutes);
  
  // Other routes
  app.use('/api/audit-logs', auditLogRoutes);
  
  try {
    const gdprRoutes = require('./routes/gdpr.routes').default;
    app.use('/api/gdpr', gdprRoutes);
  } catch (error) {
    console.warn('GDPR routes not available:', error.message);
  }
  
  try {
    const dashboardRoutes = require('./routes/dashboard.routes').default;
    app.use('/api/dashboard', dashboardRoutes);
  } catch (error) {
    console.warn('Dashboard routes not available:', error.message);
  }

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
