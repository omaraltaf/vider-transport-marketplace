import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { authorizationService } from '../services/authorization.service';
import { Role } from '@prisma/client';
import { logger } from '../config/logger';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;           // Primary identifier (same as userId)
        userId: string;       // Backward compatibility
        email: string;
        role: Role;
        companyId: string;
      };
      sessionID?: string;     // For audit logging middleware
      session?: any;          // For session-based middleware
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication token is required',
        },
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = authService.verifyToken(token);

    // Attach user info to request
    req.user = {
      id: payload.userId,        // Primary identifier
      userId: payload.userId,    // Backward compatibility
      email: payload.email,
      role: payload.role,
      companyId: payload.companyId,
    };

    next();
  } catch (error) {
    logger.warn('Authentication failed', { error: (error as Error).message });
    
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token',
      },
    });
  }
}

/**
 * Middleware to check if user has required role
 */
export function requireRole(requiredRole: Role) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const hasRole = await authorizationService.checkRole(req.user.userId, requiredRole);

      if (!hasRole) {
        logger.warn('Authorization failed - insufficient role', {
          userId: req.user.userId,
          userRole: req.user.role,
          requiredRole,
        });

        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to perform this action',
          },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Role check failed', { error: (error as Error).message });
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while checking permissions',
        },
      });
    }
  };
}

/**
 * Middleware to check if user has access to a specific company
 */
export function requireCompanyAccess(companyIdParam: string = 'companyId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      // Get company ID from request params, body, or query
      const companyId = req.params[companyIdParam] || req.body[companyIdParam] || req.query[companyIdParam];

      if (!companyId) {
        res.status(400).json({
          error: {
            code: 'MISSING_COMPANY_ID',
            message: 'Company ID is required',
          },
        });
        return;
      }

      const hasAccess = await authorizationService.checkCompanyAccess(
        req.user.userId,
        companyId as string
      );

      if (!hasAccess) {
        logger.warn('Authorization failed - company access denied', {
          userId: req.user.userId,
          companyId,
        });

        res.status(403).json({
          error: {
            code: 'COMPANY_ACCESS_DENIED',
            message: 'You do not have access to this company',
          },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Company access check failed', { error: (error as Error).message });
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while checking permissions',
        },
      });
    }
  };
}

/**
 * Middleware to check resource ownership
 */
export function requireResourceOwnership(
  resourceType: 'listing' | 'booking' | 'company',
  resourceIdParam: string = 'id'
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const resourceId = req.params[resourceIdParam];

      if (!resourceId) {
        res.status(400).json({
          error: {
            code: 'MISSING_RESOURCE_ID',
            message: 'Resource ID is required',
          },
        });
        return;
      }

      const hasOwnership = await authorizationService.checkResourceOwnership(
        req.user.userId,
        resourceId,
        resourceType
      );

      if (!hasOwnership) {
        logger.warn('Authorization failed - resource ownership denied', {
          userId: req.user.userId,
          resourceType,
          resourceId,
        });

        res.status(403).json({
          error: {
            code: 'RESOURCE_ACCESS_DENIED',
            message: 'You do not have access to this resource',
          },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Resource ownership check failed', { error: (error as Error).message });
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while checking permissions',
        },
      });
    }
  };
}

/**
 * Middleware to check if user is a platform admin
 */
export const requirePlatformAdmin = requireRole(Role.PLATFORM_ADMIN);

/**
 * Middleware to check if user is at least a company admin
 */
export const requireCompanyAdmin = requireRole(Role.COMPANY_ADMIN);

/**
 * Middleware to check if user is at least a company user
 */
export const requireCompanyUser = requireRole(Role.COMPANY_USER);
