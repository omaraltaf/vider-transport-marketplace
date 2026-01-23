import { logger } from '../config/logger';
import { Request } from 'express';

export interface ErrorContext {
  error: Error;
  request?: Request;
  userId?: string;
  companyId?: string;
  additionalContext?: Record<string, any>;
}

export interface OperationContext {
  operation: string;
  userId?: string;
  companyId?: string;
  entityType?: string;
  entityId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Log an error with full context including stack trace, request details, and user information
 */
export function logError(context: ErrorContext): void {
  const logData: Record<string, any> = {
    message: context.error.message,
    stack: context.error.stack,
    errorName: context.error.name,
  };

  if (context.request) {
    logData.request = {
      method: context.request.method,
      path: context.request.path,
      query: context.request.query,
      ip: context.request.ip,
      userAgent: context.request.get('user-agent'),
    };
  }

  if (context.userId) {
    logData.userId = context.userId;
  }

  if (context.companyId) {
    logData.companyId = context.companyId;
  }

  if (context.additionalContext) {
    logData.additionalContext = context.additionalContext;
  }

  logData.timestamp = new Date().toISOString();

  logger.error('Error occurred', logData);
}

/**
 * Log a critical operation for audit purposes
 */
export function logOperation(context: OperationContext): void {
  const logData: Record<string, any> = {
    operation: context.operation,
    timestamp: new Date().toISOString(),
  };

  if (context.userId) {
    logData.userId = context.userId;
  }

  if (context.companyId) {
    logData.companyId = context.companyId;
  }

  if (context.entityType) {
    logData.entityType = context.entityType;
  }

  if (context.entityId) {
    logData.entityId = context.entityId;
  }

  if (context.changes) {
    logData.changes = context.changes;
  }

  if (context.metadata) {
    logData.metadata = context.metadata;
  }

  logger.info('Critical operation performed', logData);
}

/**
 * Create a request context object for logging
 */
export function createRequestContext(req: Request): Record<string, any> {
  return {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };
}
