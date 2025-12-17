/**
 * Financial Management API Routes
 * Handles commission rates, revenue analytics, and dispute management endpoints
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';

// Extend Request interface to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}
import { commissionRateService, CommissionCalculationRequest, CommissionRate } from '../services/commission-rate.service';
import { revenueAnalyticsService } from '../services/revenue-analytics.service';
import { disputeRefundService } from '../services/dispute-refund.service';

const router = Router();

// Validation schemas
const CommissionRateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  rateType: z.enum(['PERCENTAGE', 'FIXED', 'TIERED']),
  baseRate: z.number().min(0).max(100),
  minRate: z.number().min(0).max(100).optional(),
  maxRate: z.number().min(0).max(100).optional(),
  tiers: z.array(z.object({
    minVolume: z.number().min(0),
    maxVolume: z.number().min(0).optional(),
    rate: z.number().min(0).max(100),
    description: z.string()
  })).optional(),
  applicableRegions: z.array(z.string()),
  companyTypes: z.array(z.string()),
  volumeThresholds: z.array(z.object({
    threshold: z.number().min(0),
    rateAdjustment: z.number(),
    adjustmentType: z.enum(['PERCENTAGE', 'FIXED'])
  })).optional(),
  effectiveDate: z.string().transform(str => new Date(str)),
  expiryDate: z.string().transform(str => new Date(str)).optional(),
  isActive: z.boolean()
});

const BulkUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string(),
    updates: CommissionRateSchema.partial()
  })),
  reason: z.string().min(1).max(500)
});

const DateRangeSchema = z.object({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str))
});

const DisputeResolutionSchema = z.object({
  outcome: z.enum(['CUSTOMER_FAVOR', 'COMPANY_FAVOR', 'PARTIAL_REFUND', 'NO_ACTION', 'ESCALATED']),
  refundAmount: z.number().min(0),
  commissionAdjustment: z.number(),
  reasoning: z.string().min(1).max(1000),
  customerNotified: z.boolean().default(true),
  companyNotified: z.boolean().default(true)
});

const RefundRequestSchema = z.object({
  bookingId: z.string(),
  disputeId: z.string().optional(),
  refundType: z.enum(['FULL', 'PARTIAL', 'COMMISSION_ONLY', 'PROCESSING_FEE']),
  reason: z.enum(['DISPUTE_RESOLUTION', 'CANCELLATION', 'SERVICE_FAILURE', 'SYSTEM_ERROR', 'GOODWILL']),
  originalAmount: z.number().min(0),
  refundAmount: z.number().min(0),
  commissionRefund: z.number().min(0).default(0)
});

// Middleware for admin authentication (placeholder)
const requirePlatformAdmin = (req: AuthenticatedRequest, res: Response, next: Function) => {
  // In real implementation, verify JWT token and platform admin role
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Mock admin user
  req.user = { 
    id: 'admin-1',
    email: 'admin@platform.com',
    role: 'PLATFORM_ADMIN'
  };
  next();
};

// Apply middleware to all routes
router.use(requirePlatformAdmin);

// ============================================================================
// COMMISSION RATE ENDPOINTS
// ============================================================================

/**
 * GET /api/platform-admin/financial/commission-rates
 * Get all commission rates with optional filtering
 */
router.get('/commission-rates', async (req: Request, res: Response) => {
  try {
    const { isActive, region, companyType, effectiveDate } = req.query;
    
    const filters: any = {};
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (region) filters.region = region as string;
    if (companyType) filters.companyType = companyType as string;
    if (effectiveDate) filters.effectiveDate = new Date(effectiveDate as string);

    const rates = await commissionRateService.getCommissionRates(filters);
    
    res.json({
      success: true,
      data: rates,
      count: rates.length
    });
  } catch (error) {
    console.error('Error fetching commission rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commission rates'
    });
  }
});

/**
 * GET /api/platform-admin/financial/commission-rates/:id
 * Get commission rate by ID
 */
router.get('/commission-rates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rate = await commissionRateService.getCommissionRateById(id);
    
    if (!rate) {
      return res.status(404).json({
        success: false,
        error: 'Commission rate not found'
      });
    }
    
    res.json({
      success: true,
      data: rate
    });
  } catch (error) {
    console.error('Error fetching commission rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commission rate'
    });
  }
});

/**
 * POST /api/platform-admin/financial/commission-rates
 * Create new commission rate
 */
router.post('/commission-rates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = CommissionRateSchema.parse(req.body);
    const createdBy = req.user?.id || 'unknown';
    
    // Add required createdBy field
    const rateData = {
      ...validatedData,
      createdBy
    } as Omit<CommissionRate, 'id' | 'createdAt' | 'updatedAt'>;
    
    const rate = await commissionRateService.createCommissionRate(rateData, createdBy);
    
    res.status(201).json({
      success: true,
      data: rate,
      message: 'Commission rate created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    console.error('Error creating commission rate:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create commission rate'
    });
  }
});

/**
 * PUT /api/platform-admin/financial/commission-rates/:id
 * Update commission rate
 */
router.put('/commission-rates/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, ...updates } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Reason for update is required'
      });
    }
    
    const validatedUpdates = CommissionRateSchema.partial().parse(updates);
    const updatedBy = req.user?.id || 'unknown';
    
    // Ensure tiers have proper structure if provided
    if (validatedUpdates.tiers) {
      validatedUpdates.tiers = validatedUpdates.tiers.map(tier => ({
        minVolume: tier.minVolume ?? 0,
        maxVolume: tier.maxVolume,
        rate: tier.rate ?? 0,
        description: tier.description ?? ''
      }));
    }
    
    const rate = await commissionRateService.updateCommissionRate(id, validatedUpdates as Partial<CommissionRate>, updatedBy, reason);
    
    res.json({
      success: true,
      data: rate,
      message: 'Commission rate updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    console.error('Error updating commission rate:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update commission rate'
    });
  }
});

/**
 * POST /api/platform-admin/financial/commission-rates/bulk-update
 * Bulk update commission rates
 */
router.post('/commission-rates/bulk-update', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { updates, reason } = BulkUpdateSchema.parse(req.body);
    const updatedBy = req.user?.id || 'unknown';
    
    // Ensure all updates have required fields and proper tier structure
    const validatedUpdates = updates.map(update => ({
      id: update.id,
      updates: {
        ...update.updates,
        ...(update.updates.tiers && {
          tiers: update.updates.tiers.map(tier => ({
            minVolume: tier.minVolume ?? 0,
            maxVolume: tier.maxVolume,
            rate: tier.rate ?? 0,
            description: tier.description ?? ''
          }))
        })
      }
    }));
    
    const result = await commissionRateService.bulkUpdateRates(validatedUpdates as { id: string; updates: Partial<CommissionRate> }[], updatedBy, reason);
    
    res.json({
      success: true,
      data: result,
      message: `Bulk update completed: ${result.success} successful, ${result.failed} failed`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    console.error('Error in bulk update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk update'
    });
  }
});

/**
 * GET /api/platform-admin/financial/commission-history
 * Get commission rate change history
 */
router.get('/commission-history', async (req: Request, res: Response) => {
  try {
    const { rateId, limit = '50', offset = '0' } = req.query;
    
    const result = await commissionRateService.getCommissionRateHistory(
      rateId as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );
    
    res.json({
      success: true,
      data: result.history,
      total: result.total,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: result.total > parseInt(offset as string) + parseInt(limit as string)
      }
    });
  } catch (error) {
    console.error('Error fetching commission history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commission history'
    });
  }
});

/**
 * POST /api/platform-admin/financial/commission-rates/calculate
 * Calculate commission for a booking
 */
router.post('/commission-rates/calculate', async (req: Request, res: Response) => {
  try {
    const validatedData = z.object({
      bookingAmount: z.number().min(0),
      companyId: z.string(),
      region: z.string(),
      companyType: z.string(),
      bookingDate: z.string().transform(str => new Date(str)),
      volumeData: z.object({
        monthlyVolume: z.number().min(0),
        yearlyVolume: z.number().min(0)
      }).optional()
    }).parse(req.body);
    
    // Ensure all required fields are present
    const calculationRequest: CommissionCalculationRequest = {
      bookingAmount: validatedData.bookingAmount,
      companyId: validatedData.companyId,
      region: validatedData.region,
      companyType: validatedData.companyType,
      bookingDate: validatedData.bookingDate,
      volumeData: validatedData.volumeData as { monthlyVolume: number; yearlyVolume: number } | undefined
    };
    
    const result = await commissionRateService.calculateCommission(calculationRequest);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    console.error('Error calculating commission:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate commission'
    });
  }
});

// ============================================================================
// REVENUE ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/platform-admin/financial/revenue/summary
 * Get revenue summary for a period
 */
router.get('/revenue/summary', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, region, companyType, bookingType } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }
    
    const filters: any = {};
    if (region) filters.region = region as string;
    if (companyType) filters.companyType = companyType as string;
    if (bookingType) filters.bookingType = bookingType as string;
    
    const summary = await revenueAnalyticsService.getRevenueSummary(
      new Date(startDate as string),
      new Date(endDate as string),
      filters
    );
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching revenue summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue summary'
    });
  }
});

/**
 * GET /api/platform-admin/financial/revenue/trends
 * Get revenue trends over time
 */
router.get('/revenue/trends', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, granularity = 'daily' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }
    
    const trends = await revenueAnalyticsService.getRevenueTrends(
      new Date(startDate as string),
      new Date(endDate as string),
      granularity as 'daily' | 'weekly' | 'monthly'
    );
    
    res.json({
      success: true,
      data: trends,
      count: trends.length
    });
  } catch (error) {
    console.error('Error fetching revenue trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue trends'
    });
  }
});

/**
 * GET /api/platform-admin/financial/revenue/forecasts
 * Get revenue forecasts
 */
router.get('/revenue/forecasts', async (req: Request, res: Response) => {
  try {
    const { historicalMonths = '12', forecastMonths = '6' } = req.query;
    
    const forecasts = await revenueAnalyticsService.getRevenueForecast(
      parseInt(historicalMonths as string),
      parseInt(forecastMonths as string)
    );
    
    res.json({
      success: true,
      data: forecasts,
      count: forecasts.length
    });
  } catch (error) {
    console.error('Error fetching revenue forecasts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue forecasts'
    });
  }
});

/**
 * GET /api/platform-admin/financial/profit-margins
 * Get profit margin analysis
 */
router.get('/profit-margins', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, segmentBy = 'region' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }
    
    const analysis = await revenueAnalyticsService.getProfitMarginAnalysis(
      new Date(startDate as string),
      new Date(endDate as string),
      segmentBy as 'region' | 'companyType' | 'bookingType'
    );
    
    res.json({
      success: true,
      data: analysis,
      count: analysis.length
    });
  } catch (error) {
    console.error('Error fetching profit margins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profit margins'
    });
  }
});

/**
 * GET /api/platform-admin/financial/revenue/breakdown
 * Get detailed revenue breakdown
 */
router.get('/revenue/breakdown', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }
    
    const breakdown = await revenueAnalyticsService.getRevenueBreakdown(
      new Date(startDate as string),
      new Date(endDate as string)
    );
    
    res.json({
      success: true,
      data: breakdown
    });
  } catch (error) {
    console.error('Error fetching revenue breakdown:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue breakdown'
    });
  }
});

/**
 * GET /api/platform-admin/financial/commission-reconciliation
 * Perform commission reconciliation
 */
router.get('/commission-reconciliation', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }
    
    const reconciliation = await revenueAnalyticsService.performCommissionReconciliation(
      new Date(startDate as string),
      new Date(endDate as string)
    );
    
    res.json({
      success: true,
      data: reconciliation
    });
  } catch (error) {
    console.error('Error performing commission reconciliation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform commission reconciliation'
    });
  }
});

// ============================================================================
// DISPUTE AND REFUND ENDPOINTS
// ============================================================================

/**
 * GET /api/platform-admin/financial/disputes
 * Get disputes with filtering and pagination
 */
router.get('/disputes', async (req: Request, res: Response) => {
  try {
    const { status, type, priority, assignedTo, startDate, endDate, limit = '50', offset = '0' } = req.query;
    
    const filters: any = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };
    
    if (status) filters.status = status as string;
    if (type) filters.type = type as string;
    if (priority) filters.priority = priority as string;
    if (assignedTo) filters.assignedTo = assignedTo as string;
    if (startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }
    
    const result = await disputeRefundService.getDisputes(filters);
    
    res.json({
      success: true,
      data: result.disputes,
      total: result.total,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: result.total > parseInt(offset as string) + parseInt(limit as string)
      }
    });
  } catch (error) {
    console.error('Error fetching disputes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch disputes'
    });
  }
});

/**
 * GET /api/platform-admin/financial/disputes/:id
 * Get dispute by ID
 */
router.get('/disputes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dispute = await disputeRefundService.getDisputeById(id);
    
    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found'
      });
    }
    
    res.json({
      success: true,
      data: dispute
    });
  } catch (error) {
    console.error('Error fetching dispute:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dispute'
    });
  }
});

/**
 * PUT /api/platform-admin/financial/disputes/:id/resolve
 * Resolve dispute
 */
router.put('/disputes/:id/resolve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedResolution = DisputeResolutionSchema.parse(req.body);
    const resolvedBy = req.user?.id || 'unknown';
    
    // Add resolvedBy to resolution object
    const resolution = {
      ...validatedResolution,
      resolvedBy
    } as any; // Type assertion for service compatibility
    
    const dispute = await disputeRefundService.resolveDispute(id, resolution, resolvedBy);
    
    res.json({
      success: true,
      data: dispute,
      message: 'Dispute resolved successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    console.error('Error resolving dispute:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resolve dispute'
    });
  }
});

/**
 * POST /api/platform-admin/financial/refunds/process
 * Process refund
 */
router.post('/refunds/process', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const refundData = RefundRequestSchema.parse(req.body);
    const requestedBy = req.user?.id || 'unknown';
    
    const refund = await disputeRefundService.processRefund({
      ...refundData,
      requestedBy
    } as any); // Type assertion for service compatibility
    
    res.status(201).json({
      success: true,
      data: refund,
      message: 'Refund processing initiated'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process refund'
    });
  }
});

/**
 * GET /api/platform-admin/financial/refunds/history
 * Get refund history
 */
router.get('/refunds/history', async (req: Request, res: Response) => {
  try {
    const { status, type, reason, startDate, endDate, limit = '50', offset = '0' } = req.query;
    
    const filters: any = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };
    
    if (status) filters.status = status as string;
    if (type) filters.type = type as string;
    if (reason) filters.reason = reason as string;
    if (startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }
    
    const result = await disputeRefundService.getRefunds(filters);
    
    res.json({
      success: true,
      data: result.refunds,
      total: result.total,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: result.total > parseInt(offset as string) + parseInt(limit as string)
      }
    });
  } catch (error) {
    console.error('Error fetching refund history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch refund history'
    });
  }
});

/**
 * GET /api/platform-admin/financial/statistics/disputes
 * Get dispute statistics
 */
router.get('/statistics/disputes', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }
    
    const stats = await disputeRefundService.getDisputeStatistics(
      new Date(startDate as string),
      new Date(endDate as string)
    );
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dispute statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dispute statistics'
    });
  }
});

/**
 * GET /api/platform-admin/financial/statistics/refunds
 * Get refund statistics
 */
router.get('/statistics/refunds', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }
    
    const stats = await disputeRefundService.getRefundStatistics(
      new Date(startDate as string),
      new Date(endDate as string)
    );
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching refund statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch refund statistics'
    });
  }
});

export default router;