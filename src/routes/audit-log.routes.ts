import { Router } from 'express';
import { auditLogService, AuditAction, AuditSeverity } from '../services/audit-log.service';
import { auditLoggingMiddleware, auditSecurityEvent } from '../middleware/audit-logging.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { requirePlatformAdmin } from '../middleware/platform-admin.middleware';

const router = Router();

// Apply authentication and platform admin authorization to all routes
router.use(authenticate);
router.use(requirePlatformAdmin);

/**
 * Get audit logs with filtering and pagination
 * GET /api/audit-logs
 */
router.get('/', 
  auditLoggingMiddleware(AuditAction.ANALYTICS_ACCESSED, {
    targetType: 'AUDIT_LOG',
    description: 'Accessed audit logs'
  }),
  async (req, res) => {
    try {
      const {
        userId,
        action,
        severity,
        targetType,
        startDate,
        endDate,
        success,
        companyId,
        ipAddress,
        page = 1,
        pageSize = 50,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
      const limit = parseInt(pageSize as string);

      const query = {
        userId: userId as string,
        action: action as AuditAction,
        severity: severity as AuditSeverity,
        targetType: targetType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        success: success === 'true' ? true : success === 'false' ? false : undefined,
        companyId: companyId as string,
        ipAddress: ipAddress as string,
        limit,
        offset,
        sortBy: sortBy as 'timestamp' | 'severity' | 'action',
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await auditLogService.getAuditLogs(query);

      res.json({
        logs: result.logs,
        pagination: {
          page: parseInt(page as string),
          pageSize: limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasMore: result.hasMore
        }
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch audit logs'
        }
      });
    }
  }
);

/**
 * Get audit log summary and statistics
 * GET /api/audit-logs/summary
 */
router.get('/summary',
  auditLoggingMiddleware(AuditAction.ANALYTICS_ACCESSED, {
    targetType: 'AUDIT_LOG',
    description: 'Accessed audit log summary'
  }),
  async (req, res) => {
    try {
      const { startDate, endDate, companyId } = req.query;

      const summary = await auditLogService.getAuditLogSummary(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        companyId as string
      );

      res.json(summary);
    } catch (error) {
      console.error('Error fetching audit log summary:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch audit log summary'
        }
      });
    }
  }
);

/**
 * Get audit trail for a specific resource
 * GET /api/audit-logs/resource/:targetType/:targetId
 */
router.get('/resource/:targetType/:targetId',
  auditLoggingMiddleware(AuditAction.ANALYTICS_ACCESSED, {
    targetType: 'AUDIT_LOG',
    description: 'Accessed resource audit trail',
    extractTargetId: (req) => `${req.params.targetType}:${req.params.targetId}`
  }),
  async (req, res) => {
    try {
      const { targetType, targetId } = req.params;
      const { limit = 100 } = req.query;

      const logs = await auditLogService.getResourceAuditTrail(
        targetType,
        targetId,
        parseInt(limit as string)
      );

      res.json({ logs });
    } catch (error) {
      console.error('Error fetching resource audit trail:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch resource audit trail'
        }
      });
    }
  }
);

/**
 * Get user activity audit trail
 * GET /api/audit-logs/user/:userId
 */
router.get('/user/:userId',
  auditLoggingMiddleware(AuditAction.ANALYTICS_ACCESSED, {
    targetType: 'USER',
    description: 'Accessed user audit trail',
    extractTargetId: (req) => req.params.userId
  }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate, limit = 100 } = req.query;

      const logs = await auditLogService.getUserAuditTrail(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        parseInt(limit as string)
      );

      res.json({ logs });
    } catch (error) {
      console.error('Error fetching user audit trail:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user audit trail'
        }
      });
    }
  }
);

/**
 * Export audit logs to CSV
 * GET /api/audit-logs/export
 */
router.get('/export',
  auditLoggingMiddleware(AuditAction.DATA_EXPORT, {
    targetType: 'AUDIT_LOG',
    description: 'Exported audit logs to CSV',
    severity: AuditSeverity.HIGH
  }),
  async (req, res) => {
    try {
      const {
        userId,
        action,
        severity,
        targetType,
        startDate,
        endDate,
        success,
        companyId,
        ipAddress
      } = req.query;

      const query = {
        userId: userId as string,
        action: action as AuditAction,
        severity: severity as AuditSeverity,
        targetType: targetType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        success: success === 'true' ? true : success === 'false' ? false : undefined,
        companyId: companyId as string,
        ipAddress: ipAddress as string,
        limit: 10000 // Max export limit
      };

      const csvData = await auditLogService.exportAuditLogs(query);

      const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvData);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to export audit logs'
        }
      });
    }
  }
);

/**
 * Get dashboard statistics for audit logs
 * GET /api/audit-logs/dashboard-stats
 */
router.get('/dashboard-stats',
  auditLoggingMiddleware(AuditAction.ANALYTICS_ACCESSED, {
    targetType: 'AUDIT_LOG',
    description: 'Accessed audit log dashboard statistics'
  }),
  async (req, res) => {
    try {
      const { days = 30 } = req.query;

      const stats = await auditLogService.getDashboardStats(parseInt(days as string));

      res.json(stats);
    } catch (error) {
      console.error('Error fetching audit log dashboard stats:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch audit log dashboard statistics'
        }
      });
    }
  }
);

/**
 * Clean up old audit logs (admin only)
 * DELETE /api/audit-logs/cleanup
 */
router.delete('/cleanup',
  auditLoggingMiddleware(AuditAction.SYSTEM_CONFIG_UPDATED, {
    targetType: 'AUDIT_LOG',
    description: 'Cleaned up old audit logs',
    severity: AuditSeverity.HIGH
  }),
  async (req, res) => {
    try {
      const { retentionDays = 365 } = req.body;

      if (retentionDays < 90) {
        return res.status(400).json({
          error: {
            code: 'INVALID_RETENTION_PERIOD',
            message: 'Retention period must be at least 90 days'
          }
        });
      }

      const deletedCount = await auditLogService.cleanupOldLogs(retentionDays);

      res.json({
        message: 'Audit log cleanup completed',
        deletedCount,
        retentionDays
      });
    } catch (error) {
      console.error('Error cleaning up audit logs:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to clean up audit logs'
        }
      });
    }
  }
);

/**
 * Search audit logs with advanced filters
 * POST /api/audit-logs/search
 */
router.post('/search',
  auditLoggingMiddleware(AuditAction.ANALYTICS_ACCESSED, {
    targetType: 'AUDIT_LOG',
    description: 'Performed advanced audit log search'
  }),
  async (req, res) => {
    try {
      const {
        filters,
        dateRange,
        pagination = { page: 1, pageSize: 50 },
        sorting = { sortBy: 'timestamp', sortOrder: 'desc' }
      } = req.body;

      const offset = (pagination.page - 1) * pagination.pageSize;

      const query = {
        ...filters,
        startDate: dateRange?.startDate ? new Date(dateRange.startDate) : undefined,
        endDate: dateRange?.endDate ? new Date(dateRange.endDate) : undefined,
        limit: pagination.pageSize,
        offset,
        sortBy: sorting.sortBy,
        sortOrder: sorting.sortOrder
      };

      const result = await auditLogService.getAuditLogs(query);

      res.json({
        logs: result.logs,
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.pageSize),
          hasMore: result.hasMore
        }
      });
    } catch (error) {
      console.error('Error searching audit logs:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search audit logs'
        }
      });
    }
  }
);

/**
 * Get audit log actions and severities for filters
 * GET /api/audit-logs/metadata
 */
router.get('/metadata', async (req, res) => {
  try {
    const actions = Object.values(AuditAction);
    const severities = Object.values(AuditSeverity);

    res.json({
      actions,
      severities,
      targetTypes: [
        'USER',
        'COMPANY',
        'LISTING',
        'BOOKING',
        'FINANCIAL',
        'SECURITY',
        'SYSTEM',
        'AUDIT_LOG',
        'CONTENT'
      ]
    });
  } catch (error) {
    console.error('Error fetching audit log metadata:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch audit log metadata'
      }
    });
  }
});

export default router;