import { Request, Response, NextFunction } from 'express';
import { auditLogService, AuditAction, AuditSeverity } from '../services/audit-log.service';

// Extend Request interface to include audit context
declare global {
  namespace Express {
    interface Request {
      auditContext?: {
        action?: AuditAction;
        targetType?: string;
        targetId?: string;
        description?: string;
        severity?: AuditSeverity;
        metadata?: any;
        startTime?: number;
      };
    }
  }
}

/**
 * Middleware to automatically log audit events for admin actions
 */
export const auditLoggingMiddleware = (
  action: AuditAction,
  options: {
    targetType?: string;
    description?: string;
    severity?: AuditSeverity;
    extractTargetId?: (req: Request) => string | undefined;
    extractMetadata?: (req: Request, res: Response) => any;
  } = {}
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Set up audit context
    req.auditContext = {
      action,
      targetType: options.targetType,
      targetId: options.extractTargetId ? options.extractTargetId(req) : req.params.id,
      description: options.description || `${action} operation`,
      severity: options.severity || AuditSeverity.MEDIUM,
      metadata: {},
      startTime
    };

    // Override res.json to capture response and log audit event
    const originalJson = res.json;
    res.json = function(body: any) {
      const duration = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 400;
      
      // Extract additional metadata if provided
      const additionalMetadata = options.extractMetadata ? 
        options.extractMetadata(req, res) : {};

      // Log the audit event
      const auditData = {
        action: req.auditContext!.action!,
        severity: req.auditContext!.severity!,
        userId: req.user?.userId,
        userEmail: req.user?.email,
        targetId: req.auditContext!.targetId,
        targetType: req.auditContext!.targetType,
        description: req.auditContext!.description!,
        metadata: {
          ...req.auditContext!.metadata,
          ...additionalMetadata,
          method: req.method,
          path: req.path,
          query: req.query,
          body: sanitizeRequestBody(req.body),
          statusCode: res.statusCode,
          responseSize: JSON.stringify(body).length
        },
        ipAddress: getClientIpAddress(req),
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID,
        success,
        errorMessage: success ? undefined : extractErrorMessage(body),
        duration,
        resourcesAccessed: [req.path],
        companyId: req.user?.companyId
      };

      // Log asynchronously to avoid blocking response
      auditLogService.logEvent(auditData).catch(error => {
        console.error('Failed to log audit event:', error);
      });

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Middleware to set audit context for complex operations
 */
export const setAuditContext = (
  action: AuditAction,
  targetType?: string,
  description?: string,
  severity: AuditSeverity = AuditSeverity.MEDIUM
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    req.auditContext = {
      action,
      targetType,
      description: description || `${action} operation`,
      severity,
      metadata: {},
      startTime: Date.now()
    };
    next();
  };
};

/**
 * Function to manually log audit event from within route handlers
 */
export const logAuditEvent = async (
  req: Request,
  res: Response,
  overrides: Partial<{
    action: AuditAction;
    targetId: string;
    targetType: string;
    description: string;
    severity: AuditSeverity;
    metadata: any;
    success: boolean;
    errorMessage: string;
  }> = {}
) => {
  const duration = req.auditContext?.startTime ? 
    Date.now() - req.auditContext.startTime : undefined;

  const auditData = {
    action: overrides.action || req.auditContext?.action || AuditAction.USER_UPDATED,
    severity: overrides.severity || req.auditContext?.severity || AuditSeverity.MEDIUM,
    userId: req.user?.userId,
    userEmail: req.user?.email,
    targetId: overrides.targetId || req.auditContext?.targetId || req.params.id,
    targetType: overrides.targetType || req.auditContext?.targetType,
    description: overrides.description || req.auditContext?.description || 'Admin operation',
    metadata: {
      ...req.auditContext?.metadata,
      ...overrides.metadata,
      method: req.method,
      path: req.path,
      query: req.query,
      body: sanitizeRequestBody(req.body)
    },
    ipAddress: getClientIpAddress(req),
    userAgent: req.get('User-Agent'),
    sessionId: req.sessionID,
    success: overrides.success !== undefined ? overrides.success : true,
    errorMessage: overrides.errorMessage,
    duration,
    resourcesAccessed: [req.path],
    companyId: req.user?.companyId
  };

  return auditLogService.logEvent(auditData);
};

/**
 * Middleware for bulk operations audit logging
 */
export const auditBulkOperation = (
  action: AuditAction,
  targetType: string,
  extractItemCount?: (req: Request) => number
) => {
  return auditLoggingMiddleware(action, {
    targetType,
    description: `Bulk ${action.toLowerCase()} operation`,
    severity: AuditSeverity.HIGH,
    extractMetadata: (req: Request) => ({
      itemCount: extractItemCount ? extractItemCount(req) : 
        (req.body.items?.length || req.body.ids?.length || 1),
      bulkOperation: true
    })
  });
};

/**
 * Middleware for security-related audit logging
 */
export const auditSecurityEvent = (
  action: AuditAction,
  description: string,
  severity: AuditSeverity = AuditSeverity.HIGH
) => {
  return auditLoggingMiddleware(action, {
    targetType: 'SECURITY',
    description,
    severity,
    extractMetadata: (req: Request) => ({
      securityEvent: true,
      riskLevel: severity,
      requestHeaders: sanitizeHeaders(req.headers)
    })
  });
};

/**
 * Middleware for financial operations audit logging
 */
export const auditFinancialOperation = (
  action: AuditAction,
  extractAmount?: (req: Request) => number
) => {
  return auditLoggingMiddleware(action, {
    targetType: 'FINANCIAL',
    description: `Financial operation: ${action}`,
    severity: AuditSeverity.HIGH,
    extractMetadata: (req: Request) => ({
      financialOperation: true,
      amount: extractAmount ? extractAmount(req) : req.body.amount,
      currency: req.body.currency || 'NOK'
    })
  });
};

/**
 * Helper function to sanitize request body for logging
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password', 'passwordHash', 'token', 'secret', 'key', 'apiKey',
    'creditCard', 'ssn', 'socialSecurityNumber', 'bankAccount'
  ];

  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Helper function to sanitize headers for logging
 */
function sanitizeHeaders(headers: any): any {
  const sensitiveHeaders = [
    'authorization', 'cookie', 'x-api-key', 'x-auth-token'
  ];

  const sanitized = { ...headers };
  
  for (const header of sensitiveHeaders) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Helper function to extract client IP address
 */
function getClientIpAddress(req: Request): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  ).split(',')[0].trim();
}

/**
 * Helper function to extract error message from response body
 */
function extractErrorMessage(body: any): string | undefined {
  if (!body) return undefined;
  
  if (typeof body === 'string') return body;
  
  if (body.error) {
    if (typeof body.error === 'string') return body.error;
    if (body.error.message) return body.error.message;
  }
  
  if (body.message) return body.message;
  
  return undefined;
}

/**
 * Decorator function for automatic audit logging of service methods
 */
export function AuditLog(
  action: AuditAction,
  options: {
    targetType?: string;
    severity?: AuditSeverity;
    extractTargetId?: (args: any[]) => string;
    extractMetadata?: (args: any[], result: any) => any;
  } = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let success = true;
      let errorMessage: string | undefined;
      let result: any;

      try {
        result = await method.apply(this, args);
        return result;
      } catch (error) {
        success = false;
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        
        // Extract audit information
        const targetId = options.extractTargetId ? options.extractTargetId(args) : args[0];
        const metadata = options.extractMetadata ? 
          options.extractMetadata(args, result) : { args: args.slice(1) };

        // Log audit event (this would need access to request context)
        auditLogService.logEvent({
          action,
          severity: options.severity || AuditSeverity.MEDIUM,
          targetId: typeof targetId === 'string' ? targetId : undefined,
          targetType: options.targetType,
          description: `Service method: ${propertyName}`,
          metadata: {
            ...metadata,
            method: propertyName,
            service: target.constructor.name
          },
          success,
          errorMessage,
          duration
        }).catch(error => {
          console.error('Failed to log service audit event:', error);
        });
      }
    };

    return descriptor;
  };
}