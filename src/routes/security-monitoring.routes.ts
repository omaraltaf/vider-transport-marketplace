import { Router } from 'express';
import { securityMonitoringService, SecurityEventType, ThreatLevel, SecurityAlertStatus } from '../services/security-monitoring.service';
import { auditLoggingMiddleware, auditSecurityEvent } from '../middleware/audit-logging.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { requirePlatformAdmin } from '../middleware/platform-admin.middleware';
import { AuditAction, AuditSeverity } from '../services/audit-log.service';

const router = Router();

// Apply authentication and platform admin authorization to all routes
router.use(authenticate);
router.use(requirePlatformAdmin);

/**
 * Get security events with filtering and pagination
 * GET /api/security/events
 */
router.get('/events',
  auditLoggingMiddleware(AuditAction.ANALYTICS_ACCESSED, {
    targetType: 'SECURITY',
    description: 'Accessed security events'
  }),
  async (req, res) => {
    try {
      const {
        type,
        threatLevel,
        status,
        userId,
        ipAddress,
        startDate,
        endDate,
        page = 1,
        pageSize = 50
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
      const limit = parseInt(pageSize as string);

      const query = {
        type: type as SecurityEventType,
        threatLevel: threatLevel as ThreatLevel,
        status: status as SecurityAlertStatus,
        userId: userId as string,
        ipAddress: ipAddress as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit,
        offset
      };

      const result = await securityMonitoringService.getSecurityEvents(query);

      res.json({
        events: result.events,
        pagination: {
          page: parseInt(page as string),
          pageSize: limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasMore: result.hasMore
        }
      });
    } catch (error) {
      console.error('Error fetching security events:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch security events'
        }
      });
    }
  }
);

/**
 * Get security metrics and statistics
 * GET /api/security/metrics
 */
router.get('/metrics',
  auditLoggingMiddleware(AuditAction.ANALYTICS_ACCESSED, {
    targetType: 'SECURITY',
    description: 'Accessed security metrics'
  }),
  async (req, res) => {
    try {
      const { days = 30 } = req.query;

      const metrics = await securityMonitoringService.getSecurityMetrics(parseInt(days as string));

      res.json(metrics);
    } catch (error) {
      console.error('Error fetching security metrics:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch security metrics'
        }
      });
    }
  }
);

/**
 * Create a security event manually
 * POST /api/security/events
 */
router.post('/events',
  auditLoggingMiddleware(AuditAction.SECURITY_ALERT, {
    targetType: 'SECURITY',
    description: 'Created security event manually',
    severity: AuditSeverity.HIGH
  }),
  async (req, res) => {
    try {
      const {
        type,
        threatLevel,
        title,
        description,
        userId,
        userEmail,
        ipAddress,
        userAgent,
        sessionId,
        riskScore,
        indicators,
        affectedResources,
        mitigationActions,
        metadata
      } = req.body;

      // Validate required fields
      if (!type || !threatLevel || !title || !description) {
        return res.status(400).json({
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Type, threat level, title, and description are required'
          }
        });
      }

      const securityEvent = await securityMonitoringService.createSecurityEvent({
        type,
        threatLevel,
        title,
        description,
        userId,
        userEmail,
        ipAddress,
        userAgent,
        sessionId,
        riskScore: riskScore || 50,
        indicators: indicators || [],
        affectedResources: affectedResources || [],
        mitigationActions: mitigationActions || [],
        metadata: metadata || {}
      });

      res.status(201).json(securityEvent);
    } catch (error) {
      console.error('Error creating security event:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create security event'
        }
      });
    }
  }
);

/**
 * Update security event status
 * PUT /api/security/events/:id/status
 */
router.put('/events/:id/status',
  auditLoggingMiddleware(AuditAction.SECURITY_ALERT, {
    targetType: 'SECURITY_EVENT',
    description: 'Updated security event status',
    extractTargetId: (req) => req.params.id
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, assignedTo, resolutionNotes } = req.body;

      // Validate status
      const validStatuses = Object.values(SecurityAlertStatus);
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_STATUS',
            message: `Status must be one of: ${validStatuses.join(', ')}`
          }
        });
      }

      const updatedEvent = await securityMonitoringService.updateSecurityEventStatus(
        id,
        status,
        assignedTo,
        resolutionNotes
      );

      res.json(updatedEvent);
    } catch (error) {
      console.error('Error updating security event status:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update security event status'
        }
      });
    }
  }
);

/**
 * Trigger brute force analysis for an IP
 * POST /api/security/analyze/brute-force
 */
router.post('/analyze/brute-force',
  auditSecurityEvent(
    AuditAction.SECURITY_ALERT,
    'Triggered brute force analysis',
    AuditSeverity.MEDIUM
  ),
  async (req, res) => {
    try {
      const { ipAddress, userId } = req.body;

      if (!ipAddress) {
        return res.status(400).json({
          error: {
            code: 'MISSING_IP_ADDRESS',
            message: 'IP address is required'
          }
        });
      }

      await securityMonitoringService.analyzeBruteForceAttempts(ipAddress, userId);

      res.json({
        message: 'Brute force analysis completed',
        ipAddress,
        userId
      });
    } catch (error) {
      console.error('Error analyzing brute force attempts:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to analyze brute force attempts'
        }
      });
    }
  }
);

/**
 * Trigger suspicious login analysis
 * POST /api/security/analyze/suspicious-login
 */
router.post('/analyze/suspicious-login',
  auditSecurityEvent(
    AuditAction.SECURITY_ALERT,
    'Triggered suspicious login analysis',
    AuditSeverity.MEDIUM
  ),
  async (req, res) => {
    try {
      const { userId, userEmail, ipAddress, userAgent, location } = req.body;

      if (!userId || !userEmail || !ipAddress || !userAgent) {
        return res.status(400).json({
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'User ID, email, IP address, and user agent are required'
          }
        });
      }

      await securityMonitoringService.detectSuspiciousLogin(
        userId,
        userEmail,
        ipAddress,
        userAgent,
        location
      );

      res.json({
        message: 'Suspicious login analysis completed',
        userId,
        userEmail
      });
    } catch (error) {
      console.error('Error analyzing suspicious login:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to analyze suspicious login'
        }
      });
    }
  }
);

/**
 * Trigger anomalous behavior analysis for a user
 * POST /api/security/analyze/anomalous-behavior
 */
router.post('/analyze/anomalous-behavior',
  auditSecurityEvent(
    AuditAction.SECURITY_ALERT,
    'Triggered anomalous behavior analysis',
    AuditSeverity.MEDIUM
  ),
  async (req, res) => {
    try {
      const { userId, userEmail } = req.body;

      if (!userId || !userEmail) {
        return res.status(400).json({
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'User ID and email are required'
          }
        });
      }

      await securityMonitoringService.detectAnomalousBehavior(userId, userEmail);

      res.json({
        message: 'Anomalous behavior analysis completed',
        userId,
        userEmail
      });
    } catch (error) {
      console.error('Error analyzing anomalous behavior:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to analyze anomalous behavior'
        }
      });
    }
  }
);

/**
 * Get security event types and threat levels for filters
 * GET /api/security/metadata
 */
router.get('/metadata', async (req, res) => {
  try {
    const eventTypes = Object.values(SecurityEventType);
    const threatLevels = Object.values(ThreatLevel);
    const alertStatuses = Object.values(SecurityAlertStatus);

    res.json({
      eventTypes,
      threatLevels,
      alertStatuses
    });
  } catch (error) {
    console.error('Error fetching security metadata:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch security metadata'
      }
    });
  }
});

export default router;