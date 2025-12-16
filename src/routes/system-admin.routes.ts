import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { SystemConfigService } from '../services/system-config.service';
import { BackupRecoveryService } from '../services/backup-recovery.service';
import { ApiRateLimitingService } from '../services/api-rate-limiting.service';
import { authenticate } from '../middleware/auth.middleware';
import { requirePlatformAdmin } from '../middleware/platform-admin.middleware';

const prisma = new PrismaClient();

const router = Router();
const systemConfigService = SystemConfigService.getInstance();
const backupRecoveryService = BackupRecoveryService.getInstance();
const rateLimitingService = ApiRateLimitingService.getInstance();

// Apply authentication and platform admin middleware to all routes
router.use(authenticate);
router.use(requirePlatformAdmin);

// System Configuration Endpoints
router.get('/config', async (req, res) => {
  try {
    const { category } = req.query;
    const configs = await systemConfigService.getSystemConfig(category as string);
    
    res.json({
      success: true,
      data: configs,
      total: configs.length
    });
  } catch (error) {
    console.error('Error fetching system config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system configuration'
    });
  }
});

router.put('/config/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const updatedBy = req.user?.id || 'unknown';

    const updatedConfig = await systemConfigService.updateSystemConfig(
      key,
      value,
      updatedBy
    );

    res.json({
      success: true,
      data: updatedConfig,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating system config:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/config', async (req, res) => {
  try {
    const configData = req.body;
    const createdBy = req.user?.id || 'unknown';

    const newConfig = await systemConfigService.createSystemConfig(
      configData,
      createdBy
    );

    res.status(201).json({
      success: true,
      data: newConfig,
      message: 'Configuration created successfully'
    });
  } catch (error) {
    console.error('Error creating system config:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// System Health Endpoints
router.get('/health', async (req, res) => {
  try {
    const healthMetrics = await systemConfigService.getSystemHealth();
    
    res.json({
      success: true,
      data: healthMetrics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system health metrics'
    });
  }
});

router.get('/health/history', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const history = await systemConfigService.getSystemHealthHistory(Number(hours));
    
    res.json({
      success: true,
      data: history,
      total: history.length
    });
  } catch (error) {
    console.error('Error fetching health history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch health history'
    });
  }
});

router.get('/metrics/performance', async (req, res) => {
  try {
    const metrics = await systemConfigService.collectPerformanceMetrics();
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics'
    });
  }
});

// System Alerts Endpoints
router.get('/alerts', async (req, res) => {
  try {
    const { type, acknowledged } = req.query;
    const alerts = await systemConfigService.getSystemAlerts(
      type as any,
      acknowledged === 'true' ? true : acknowledged === 'false' ? false : undefined
    );
    
    res.json({
      success: true,
      data: alerts,
      total: alerts.length
    });
  } catch (error) {
    console.error('Error fetching system alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system alerts'
    });
  }
});

router.put('/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;
    const acknowledgedBy = req.user?.id || 'unknown';

    await systemConfigService.acknowledgeAlert(alertId, acknowledgedBy);
    
    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const resolvedBy = req.user?.id || 'unknown';

    await systemConfigService.resolveAlert(alertId, resolvedBy);
    
    res.json({
      success: true,
      message: 'Alert resolved successfully'
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Backup Management Endpoints
router.post('/backup/create', async (req, res) => {
  try {
    const { type, options } = req.body;
    const createdBy = req.user?.id || 'unknown';

    const backupJob = await backupRecoveryService.createBackup(
      type,
      options || {},
      createdBy
    );

    res.status(201).json({
      success: true,
      data: backupJob,
      message: 'Backup job created successfully'
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/backup/jobs', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const jobs = await backupRecoveryService.getBackupJobs(
      status as any,
      Number(limit)
    );
    
    res.json({
      success: true,
      data: jobs,
      total: jobs.length
    });
  } catch (error) {
    console.error('Error fetching backup jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backup jobs'
    });
  }
});

router.get('/backup/jobs/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    const job = await backupRecoveryService.getBackupJob(backupId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Backup job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error fetching backup job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backup job'
    });
  }
});

router.put('/backup/jobs/:backupId/cancel', async (req, res) => {
  try {
    const { backupId } = req.params;
    const cancelledBy = req.user?.id || 'unknown';

    await backupRecoveryService.cancelBackup(backupId, cancelledBy);
    
    res.json({
      success: true,
      message: 'Backup cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling backup:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/backup/jobs/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    const deletedBy = req.user?.id || 'unknown';

    await backupRecoveryService.deleteBackup(backupId, deletedBy);
    
    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/backup/verify/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    const verification = await backupRecoveryService.verifyBackup(backupId);
    
    res.json({
      success: true,
      data: verification
    });
  } catch (error) {
    console.error('Error verifying backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify backup'
    });
  }
});

// Backup Scheduling Endpoints
router.post('/backup/schedules', async (req, res) => {
  try {
    const scheduleData = req.body;
    const createdBy = req.user?.id || 'unknown';

    const schedule = await backupRecoveryService.createBackupSchedule(
      scheduleData,
      createdBy
    );

    res.status(201).json({
      success: true,
      data: schedule,
      message: 'Backup schedule created successfully'
    });
  } catch (error) {
    console.error('Error creating backup schedule:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/backup/schedules', async (req, res) => {
  try {
    const schedules = await backupRecoveryService.getBackupSchedules();
    
    res.json({
      success: true,
      data: schedules,
      total: schedules.length
    });
  } catch (error) {
    console.error('Error fetching backup schedules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backup schedules'
    });
  }
});

router.put('/backup/schedules/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const updates = req.body;
    const updatedBy = req.user?.id || 'unknown';

    const schedule = await backupRecoveryService.updateBackupSchedule(
      scheduleId,
      updates,
      updatedBy
    );

    res.json({
      success: true,
      data: schedule,
      message: 'Backup schedule updated successfully'
    });
  } catch (error) {
    console.error('Error updating backup schedule:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Restore Operations Endpoints
router.post('/backup/restore', async (req, res) => {
  try {
    const { backupId, options } = req.body;
    const createdBy = req.user?.id || 'unknown';

    const restoreJob = await backupRecoveryService.createRestoreJob(
      backupId,
      options || {},
      createdBy
    );

    res.status(201).json({
      success: true,
      data: restoreJob,
      message: 'Restore job created successfully'
    });
  } catch (error) {
    console.error('Error creating restore job:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/backup/restore/jobs', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const jobs = await backupRecoveryService.getRestoreJobs(Number(limit));
    
    res.json({
      success: true,
      data: jobs,
      total: jobs.length
    });
  } catch (error) {
    console.error('Error fetching restore jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restore jobs'
    });
  }
});

router.get('/backup/restore/jobs/:restoreId', async (req, res) => {
  try {
    const { restoreId } = req.params;
    const job = await backupRecoveryService.getRestoreJob(restoreId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Restore job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error fetching restore job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restore job'
    });
  }
});

// Disaster Recovery Endpoints
router.post('/disaster-recovery/plans', async (req, res) => {
  try {
    const planData = req.body;
    const createdBy = req.user?.id || 'unknown';

    const plan = await backupRecoveryService.createRecoveryPlan(
      planData,
      createdBy
    );

    res.status(201).json({
      success: true,
      data: plan,
      message: 'Disaster recovery plan created successfully'
    });
  } catch (error) {
    console.error('Error creating recovery plan:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/disaster-recovery/plans', async (req, res) => {
  try {
    const plans = await backupRecoveryService.getRecoveryPlans();
    
    res.json({
      success: true,
      data: plans,
      total: plans.length
    });
  } catch (error) {
    console.error('Error fetching recovery plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recovery plans'
    });
  }
});

router.post('/disaster-recovery/plans/:planId/test', async (req, res) => {
  try {
    const { planId } = req.params;
    const testedBy = req.user?.id || 'unknown';

    const testResult = await backupRecoveryService.testRecoveryPlan(
      planId,
      testedBy
    );

    res.json({
      success: true,
      data: testResult,
      message: 'Recovery plan test completed'
    });
  } catch (error) {
    console.error('Error testing recovery plan:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Rate Limiting Management Endpoints
router.post('/rate-limits/rules', async (req, res) => {
  try {
    const ruleData = req.body;
    const createdBy = req.user?.id || 'unknown';

    const rule = await rateLimitingService.createRateLimitRule(
      ruleData,
      createdBy
    );

    res.status(201).json({
      success: true,
      data: rule,
      message: 'Rate limit rule created successfully'
    });
  } catch (error) {
    console.error('Error creating rate limit rule:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/rate-limits/rules', async (req, res) => {
  try {
    const { enabled } = req.query;
    const rules = await rateLimitingService.getRateLimitRules(
      enabled === 'true' ? true : enabled === 'false' ? false : undefined
    );
    
    res.json({
      success: true,
      data: rules,
      total: rules.length
    });
  } catch (error) {
    console.error('Error fetching rate limit rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rate limit rules'
    });
  }
});

router.put('/rate-limits/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;
    const updatedBy = req.user?.id || 'unknown';

    const rule = await rateLimitingService.updateRateLimitRule(
      ruleId,
      updates,
      updatedBy
    );

    res.json({
      success: true,
      data: rule,
      message: 'Rate limit rule updated successfully'
    });
  } catch (error) {
    console.error('Error updating rate limit rule:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/rate-limits/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const deletedBy = req.user?.id || 'unknown';

    await rateLimitingService.deleteRateLimitRule(ruleId, deletedBy);
    
    res.json({
      success: true,
      message: 'Rate limit rule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting rate limit rule:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Access Control Endpoints
router.post('/access-control/rules', async (req, res) => {
  try {
    const ruleData = req.body;
    const createdBy = req.user?.id || 'unknown';

    const rule = await rateLimitingService.createAccessControlRule(
      ruleData,
      createdBy
    );

    res.status(201).json({
      success: true,
      data: rule,
      message: 'Access control rule created successfully'
    });
  } catch (error) {
    console.error('Error creating access control rule:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/access-control/rules', async (req, res) => {
  try {
    const { enabled } = req.query;
    const rules = await rateLimitingService.getAccessControlRules(
      enabled === 'true' ? true : enabled === 'false' ? false : undefined
    );
    
    res.json({
      success: true,
      data: rules,
      total: rules.length
    });
  } catch (error) {
    console.error('Error fetching access control rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch access control rules'
    });
  }
});

router.put('/access-control/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;
    const updatedBy = req.user?.id || 'unknown';

    const rule = await rateLimitingService.updateAccessControlRule(
      ruleId,
      updates,
      updatedBy
    );

    res.json({
      success: true,
      data: rule,
      message: 'Access control rule updated successfully'
    });
  } catch (error) {
    console.error('Error updating access control rule:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// API Usage Analytics Endpoints
router.get('/api-usage/metrics', async (req, res) => {
  try {
    const { endpoint, start, end } = req.query;
    
    const timeRange = start && end ? {
      start: new Date(start as string),
      end: new Date(end as string)
    } : undefined;

    const metrics = await rateLimitingService.getApiUsageMetrics(
      endpoint as string,
      timeRange
    );
    
    res.json({
      success: true,
      data: metrics,
      total: metrics.length
    });
  } catch (error) {
    console.error('Error fetching API usage metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API usage metrics'
    });
  }
});

router.get('/api-usage/violations', async (req, res) => {
  try {
    const { limit = 100, ruleId } = req.query;
    const violations = await rateLimitingService.getRateLimitViolations(
      Number(limit),
      ruleId as string
    );
    
    res.json({
      success: true,
      data: violations,
      total: violations.length
    });
  } catch (error) {
    console.error('Error fetching rate limit violations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rate limit violations'
    });
  }
});

// Audit Trail Endpoints
router.get('/audit/logs', async (req, res) => {
  try {
    const { 
      action, 
      entityType, 
      adminId, 
      start, 
      end, 
      limit = 100, 
      offset = 0 
    } = req.query;

    // Build where clause for filtering
    const where: any = {};
    
    if (action) where.action = { contains: action as string };
    if (entityType) where.entityType = entityType as string;
    if (adminId) where.adminId = adminId as string;
    if (start || end) {
      where.timestamp = {};
      if (start) where.timestamp.gte = new Date(start as string);
      if (end) where.timestamp.lte = new Date(end as string);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: Number(limit),
        skip: Number(offset),
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      success: true,
      data: logs,
      total,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + logs.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
});

export default router;