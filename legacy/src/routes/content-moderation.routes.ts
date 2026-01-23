/**
 * Content Moderation API Routes
 * Handles content review, fraud detection, and blacklist management endpoints
 */

import { Router } from 'express';
import { contentModerationService } from '../services/content-moderation.service';
import { fraudDetectionService } from '../services/fraud-detection.service';
import { blacklistManagementService } from '../services/blacklist-management.service';

const router = Router();

// ============================================================================
// Content Moderation Routes
// ============================================================================

/**
 * GET /api/platform-admin/moderation/content/flagged
 * Get flagged content items
 */
router.get('/content/flagged', async (req, res) => {
  try {
    const filters = {
      status: req.query.status as string,
      flagType: req.query.flagType as string,
      severity: req.query.severity as string,
      contentType: req.query.contentType as string,
      limit: parseInt(req.query.limit as string) || 50,
      offset: parseInt(req.query.offset as string) || 0
    };

    const result = await contentModerationService.getFlaggedContent(filters);
    
    res.json({
      success: true,
      data: result.items,
      total: result.total,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        hasMore: result.total > filters.offset + filters.limit
      }
    });
  } catch (error) {
    console.error('Error fetching flagged content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch flagged content'
    });
  }
});

/**
 * GET /api/platform-admin/moderation/content/queue
 * Get moderation queue
 */
router.get('/content/queue', async (req, res) => {
  try {
    const queue = await contentModerationService.getModerationQueue();
    
    res.json({
      success: true,
      data: queue
    });
  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch moderation queue'
    });
  }
});

/**
 * PUT /api/platform-admin/moderation/content/:id/review
 * Review content flag
 */
router.put('/content/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, notes, actions } = req.body;
    const reviewedBy = req.user?.id || 'admin-user';

    if (!['APPROVE', 'REJECT', 'ESCALATE'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid decision. Must be APPROVE, REJECT, or ESCALATE'
      });
    }

    const updatedFlag = await contentModerationService.reviewContentFlag(
      id,
      decision,
      reviewedBy,
      notes,
      actions
    );

    res.json({
      success: true,
      data: updatedFlag,
      message: `Content flag ${decision.toLowerCase()}d successfully`
    });
  } catch (error) {
    console.error('Error reviewing content flag:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to review content flag'
    });
  }
});

/**
 * POST /api/platform-admin/moderation/content/:id/flag
 * Flag content for review
 */
router.post('/content/:id/flag', async (req, res) => {
  try {
    const { id } = req.params;
    const { contentType, flagType, severity, reason, description, evidence } = req.body;
    const flaggedBy = req.user?.id || 'admin-user';

    const flag = await contentModerationService.flagContent(
      id,
      contentType,
      { flagType, severity, reason, description, evidence },
      flaggedBy
    );

    res.status(201).json({
      success: true,
      data: flag,
      message: 'Content flagged successfully'
    });
  } catch (error) {
    console.error('Error flagging content:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to flag content'
    });
  }
});

/**
 * POST /api/platform-admin/moderation/content/:id/scan
 * Perform automated content scan
 */
router.post('/content/:id/scan', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, contentType } = req.body;

    if (!content || !contentType) {
      return res.status(400).json({
        success: false,
        error: 'Content and contentType are required'
      });
    }

    const scanResult = await contentModerationService.scanContent(id, content, contentType);

    res.json({
      success: true,
      data: scanResult,
      message: 'Content scan completed'
    });
  } catch (error) {
    console.error('Error scanning content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan content'
    });
  }
});

/**
 * GET /api/platform-admin/moderation/content/:id
 * Get content item details
 */
router.get('/content/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const content = await contentModerationService.getContentItem(id);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content'
    });
  }
});

/**
 * GET /api/platform-admin/moderation/stats
 * Get moderation statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await contentModerationService.getModerationStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching moderation stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch moderation statistics'
    });
  }
});

// ============================================================================
// Fraud Detection Routes
// ============================================================================

/**
 * GET /api/platform-admin/moderation/fraud/alerts
 * Get fraud alerts
 */
router.get('/fraud/alerts', async (req, res) => {
  try {
    const filters: any = {
      status: req.query.status as string,
      type: req.query.type as string,
      severity: req.query.severity as string,
      assignedTo: req.query.assignedTo as string,
      limit: parseInt(req.query.limit as string) || 50,
      offset: parseInt(req.query.offset as string) || 0
    };

    // Add date range if provided
    if (req.query.startDate && req.query.endDate) {
      filters.dateRange = {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string)
      };
    }

    const result = await fraudDetectionService.getFraudAlerts(filters);
    
    res.json({
      success: true,
      data: result.alerts,
      total: result.total,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        hasMore: result.total > filters.offset + filters.limit
      }
    });
  } catch (error) {
    console.error('Error fetching fraud alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fraud alerts'
    });
  }
});

/**
 * POST /api/platform-admin/moderation/fraud/:id/investigate
 * Start fraud investigation
 */
router.post('/fraud/:id/investigate', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const investigatedBy = req.user?.id || 'admin-user';

    const alert = await fraudDetectionService.investigateAlert(id, investigatedBy, notes);

    res.json({
      success: true,
      data: alert,
      message: 'Fraud investigation started'
    });
  } catch (error) {
    console.error('Error starting fraud investigation:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start investigation'
    });
  }
});

/**
 * PUT /api/platform-admin/moderation/fraud/:id/resolve
 * Resolve fraud alert
 */
router.put('/fraud/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, notes, actions } = req.body;
    const resolvedBy = req.user?.id || 'admin-user';

    if (!['CONFIRMED_FRAUD', 'FALSE_POSITIVE'].includes(resolution)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid resolution. Must be CONFIRMED_FRAUD or FALSE_POSITIVE'
      });
    }

    const alert = await fraudDetectionService.resolveAlert(
      id,
      resolution,
      resolvedBy,
      notes,
      actions
    );

    res.json({
      success: true,
      data: alert,
      message: `Fraud alert resolved as ${resolution}`
    });
  } catch (error) {
    console.error('Error resolving fraud alert:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resolve fraud alert'
    });
  }
});

/**
 * GET /api/platform-admin/moderation/fraud/stats
 * Get fraud detection statistics
 */
router.get('/fraud/stats', async (req, res) => {
  try {
    const stats = await fraudDetectionService.getFraudStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching fraud stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fraud statistics'
    });
  }
});

/**
 * GET /api/platform-admin/moderation/fraud/risk/:userId
 * Get user risk assessment
 */
router.get('/fraud/risk/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const assessment = await fraudDetectionService.assessUserRisk(userId);
    
    res.json({
      success: true,
      data: assessment
    });
  } catch (error) {
    console.error('Error assessing user risk:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assess user risk'
    });
  }
});

/**
 * POST /api/platform-admin/moderation/fraud/detect
 * Trigger fraud detection
 */
router.post('/fraud/detect', async (req, res) => {
  try {
    const { entityType, entityId, context } = req.body;

    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        error: 'entityType and entityId are required'
      });
    }

    const alerts = await fraudDetectionService.detectFraud(entityType, entityId, context || {});

    res.json({
      success: true,
      data: alerts,
      message: `Fraud detection completed. ${alerts.length} alerts generated.`
    });
  } catch (error) {
    console.error('Error detecting fraud:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect fraud'
    });
  }
});

// ============================================================================
// Blacklist Management Routes
// ============================================================================

/**
 * GET /api/platform-admin/moderation/blacklist
 * Get blacklist entries
 */
router.get('/blacklist', async (req, res) => {
  try {
    const filters = {
      type: req.query.type as string,
      status: req.query.status as string,
      severity: req.query.severity as string,
      source: req.query.source as string,
      search: req.query.search as string,
      limit: parseInt(req.query.limit as string) || 50,
      offset: parseInt(req.query.offset as string) || 0
    };

    const result = await blacklistManagementService.getBlacklistEntries(filters);
    
    res.json({
      success: true,
      data: result.entries,
      total: result.total,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        hasMore: result.total > filters.offset + filters.limit
      }
    });
  } catch (error) {
    console.error('Error fetching blacklist entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blacklist entries'
    });
  }
});

/**
 * POST /api/platform-admin/moderation/blacklist/add
 * Add entry to blacklist
 */
router.post('/blacklist/add', async (req, res) => {
  try {
    const { type, value, reason, description, severity, expiresAt, metadata } = req.body;
    const addedBy = req.user?.id || 'admin-user';

    if (!type || !value || !reason || !description || !severity) {
      return res.status(400).json({
        success: false,
        error: 'type, value, reason, description, and severity are required'
      });
    }

    const entry = await blacklistManagementService.addToBlacklist(
      {
        type,
        value,
        reason,
        description,
        severity,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        metadata
      },
      addedBy
    );

    res.status(201).json({
      success: true,
      data: entry,
      message: 'Entry added to blacklist successfully'
    });
  } catch (error) {
    console.error('Error adding to blacklist:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add to blacklist'
    });
  }
});

/**
 * DELETE /api/platform-admin/moderation/blacklist/:id
 * Remove entry from blacklist
 */
router.delete('/blacklist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const removedBy = req.user?.id || 'admin-user';

    await blacklistManagementService.removeFromBlacklist(id, removedBy, reason);

    res.json({
      success: true,
      message: 'Entry removed from blacklist successfully'
    });
  } catch (error) {
    console.error('Error removing from blacklist:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove from blacklist'
    });
  }
});

/**
 * POST /api/platform-admin/moderation/blacklist/check
 * Check if value is blacklisted
 */
router.post('/blacklist/check', async (req, res) => {
  try {
    const { type, value, context } = req.body;

    if (!type || !value) {
      return res.status(400).json({
        success: false,
        error: 'type and value are required'
      });
    }

    const result = await blacklistManagementService.checkBlacklist(type, value, context);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error checking blacklist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check blacklist'
    });
  }
});

/**
 * POST /api/platform-admin/moderation/blacklist/bulk-check
 * Bulk check multiple values
 */
router.post('/blacklist/bulk-check', async (req, res) => {
  try {
    const { checks } = req.body;

    if (!Array.isArray(checks)) {
      return res.status(400).json({
        success: false,
        error: 'checks must be an array of {type, value} objects'
      });
    }

    const results = await blacklistManagementService.bulkCheckBlacklist(checks);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error bulk checking blacklist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk check blacklist'
    });
  }
});

/**
 * GET /api/platform-admin/moderation/blacklist/stats
 * Get blacklist statistics
 */
router.get('/blacklist/stats', async (req, res) => {
  try {
    const stats = await blacklistManagementService.getBlacklistStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching blacklist stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blacklist statistics'
    });
  }
});

/**
 * POST /api/platform-admin/moderation/blacklist/import
 * Import blacklist entries
 */
router.post('/blacklist/import', async (req, res) => {
  try {
    const { entries, source } = req.body;
    const importedBy = req.user?.id || 'admin-user';

    if (!Array.isArray(entries)) {
      return res.status(400).json({
        success: false,
        error: 'entries must be an array'
      });
    }

    const result = await blacklistManagementService.importBlacklistEntries(
      entries,
      importedBy,
      source || 'manual_import'
    );

    res.json({
      success: true,
      data: result,
      message: `Import completed: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`
    });
  } catch (error) {
    console.error('Error importing blacklist entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import blacklist entries'
    });
  }
});

export default router;