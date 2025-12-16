import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { logger } from '../config/logger';

/**
 * Middleware to ensure only platform admins can access certain routes
 * This provides an additional layer of security for platform-level operations
 */
export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
        },
      });
      return;
    }

    if (req.user.role !== Role.PLATFORM_ADMIN) {
      logger.warn('Platform admin access denied', {
        userId: req.user.userId,
        userRole: req.user.role,
        attemptedAction: req.path,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(403).json({
        error: {
          code: 'PLATFORM_ADMIN_REQUIRED',
          message: 'Platform administrator privileges are required for this operation',
        },
      });
      return;
    }

    // Log platform admin access for audit purposes
    logger.info('Platform admin access granted', {
      userId: req.user.userId,
      email: req.user.email,
      action: req.path,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    next();
  } catch (error) {
    logger.error('Platform admin middleware error', { 
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while checking platform admin permissions',
      },
    });
  }
}

/**
 * Middleware to log all platform admin actions for audit trail
 */
export function auditPlatformAdminAction(req: Request, res: Response, next: NextFunction): void {
  // Store original json method
  const originalJson = res.json;

  // Override json method to capture response
  res.json = function(body: any) {
    // Log the action after response is sent
    if (req.user && req.user.role === Role.PLATFORM_ADMIN) {
      logger.info('Platform admin action completed', {
        userId: req.user.userId,
        email: req.user.email,
        action: req.path,
        method: req.method,
        statusCode: res.statusCode,
        requestBody: req.method !== 'GET' ? req.body : undefined,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      });
    }

    // Call original json method
    return originalJson.call(this, body);
  };

  next();
}