import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface Dispute {
  id: string;
  bookingId: string;
  raisedBy: string;
  reason: string;
  description?: string;
  status: 'OPEN' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
  resolution?: string;
  refundAmount?: number;
  notes?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Refund {
  id: string;
  bookingId: string;
  disputeId?: string;
  refundType: 'FULL' | 'PARTIAL' | 'COMMISSION_ONLY' | 'PROCESSING_FEE';
  reason: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  originalAmount: number;
  refundAmount: number;
  commissionRefund: number;
  processingFee: number;
  netRefund: number;
  paymentMethod: string;
  paymentReference?: string;
  requestedBy: string;
  approvedBy?: string;
  processedBy?: string;
  customerNotified: boolean;
  timeline: Array<{
    status: string;
    timestamp: Date;
    notes?: string;
  }>;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
}

export interface DisputeStatistics {
  totalDisputes: number;
  openDisputes: number;
  resolvedDisputes: number;
  averageResolutionTime: number;
  disputesByReason: Record<string, number>;
  disputesByStatus: Record<string, number>;
  totalRefundAmount: number;
}

export interface RefundStatistics {
  totalRefunds: number;
  totalRefundAmount: number;
  averageProcessingTime: number;
  refundsByType: Record<string, { count: number; amount: number }>;
  refundsByReason: Record<string, { count: number; amount: number }>;
  successRate: number;
}

class DisputeRefundService {
  async getDisputes(filters?: {
    status?: string;
    dateRange?: { start: Date; end: Date };
    page?: number;
    limit?: number;
    offset?: number;
  }): Promise<{
    disputes: Dispute[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      // Get disputes from database
      const disputes = await prisma.dispute.findMany({
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      });

      const total = await prisma.dispute.count();

      const transformedDisputes: Dispute[] = disputes.map(dispute => ({
        id: dispute.id,
        bookingId: dispute.bookingId,
        raisedBy: dispute.raisedBy,
        reason: dispute.reason,
        description: dispute.description || undefined,
        status: dispute.status as any,
        resolution: dispute.resolution || undefined,
        refundAmount: dispute.refundAmount || undefined,
        notes: dispute.notes || undefined,
        resolvedBy: dispute.resolvedBy || undefined,
        resolvedAt: dispute.resolvedAt || undefined,
        createdAt: dispute.createdAt,
        updatedAt: dispute.updatedAt,
      }));

      return {
        disputes: transformedDisputes,
        total,
        pagination: {
          page: filters?.page || 1,
          limit: filters?.limit || 50,
          totalPages: Math.ceil(total / (filters?.limit || 50))
        }
      };
    } catch (error) {
      logger.error('Error getting disputes:', error);
      throw error;
    }
  }

  async getRefunds(filters?: {
    status?: string;
    dateRange?: { start: Date; end: Date };
    page?: number;
    limit?: number;
    offset?: number;
  }): Promise<{
    refunds: Refund[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      // TODO: Implement refund table in database schema
      // For now, return empty results since refund table doesn't exist
      const refunds: any[] = [];
      const total = 0;

      // Transform database refunds to service interface
      const transformedRefunds: Refund[] = []; // Empty since refund table doesn't exist

      return {
        refunds: transformedRefunds,
        total,
        pagination: {
          page: filters?.page || 1,
          limit: filters?.limit || 50,
          totalPages: Math.ceil(total / (filters?.limit || 50))
        }
      };
    } catch (error) {
      logger.error('Error getting refunds:', error);
      throw error;
    }
  }

  async getDisputeStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<DisputeStatistics> {
    try {
      const totalDisputes = await prisma.dispute.count({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        }
      });

      const openDisputes = await prisma.dispute.count({
        where: {
          status: 'OPEN',
          createdAt: { gte: startDate, lte: endDate }
        }
      });

      const resolvedDisputes = await prisma.dispute.count({
        where: {
          status: 'RESOLVED',
          createdAt: { gte: startDate, lte: endDate }
        }
      });

      return {
        totalDisputes,
        openDisputes,
        resolvedDisputes,
        averageResolutionTime: 0,
        disputesByReason: {},
        disputesByStatus: {},
        totalRefundAmount: 0,
      };
    } catch (error) {
      logger.error('Error getting dispute statistics:', error);
      throw error;
    }
  }

  async getDisputeById(id: string): Promise<Dispute | null> {
    try {
      const dispute = await prisma.dispute.findUnique({
        where: { id },
      });

      if (!dispute) {
        return null;
      }

      return {
        id: dispute.id,
        bookingId: dispute.bookingId,
        raisedBy: dispute.raisedBy,
        reason: dispute.reason,
        description: dispute.description || undefined,
        status: dispute.status as any,
        resolution: dispute.resolution || undefined,
        refundAmount: dispute.refundAmount || undefined,
        notes: dispute.notes || undefined,
        resolvedBy: dispute.resolvedBy || undefined,
        resolvedAt: dispute.resolvedAt || undefined,
        createdAt: dispute.createdAt,
        updatedAt: dispute.updatedAt,
      };
    } catch (error) {
      logger.error('Error getting dispute by ID:', error);
      throw error;
    }
  }

  async resolveDispute(
    id: string,
    resolution: string,
    resolvedBy: string
  ): Promise<Dispute> {
    try {
      const dispute = await prisma.dispute.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolution,
          resolvedBy,
          resolvedAt: new Date(),
        },
      });

      return {
        id: dispute.id,
        bookingId: dispute.bookingId,
        raisedBy: dispute.raisedBy,
        reason: dispute.reason,
        description: dispute.description || undefined,
        status: dispute.status as any,
        resolution: dispute.resolution || undefined,
        refundAmount: dispute.refundAmount || undefined,
        notes: dispute.notes || undefined,
        resolvedBy: dispute.resolvedBy || undefined,
        resolvedAt: dispute.resolvedAt || undefined,
        createdAt: dispute.createdAt,
        updatedAt: dispute.updatedAt,
      };
    } catch (error) {
      logger.error('Error resolving dispute:', error);
      throw error;
    }
  }

  async processRefund(refundData: {
    bookingId: string;
    disputeId?: string;
    refundType: 'FULL' | 'PARTIAL' | 'COMMISSION_ONLY' | 'PROCESSING_FEE';
    reason: string;
    originalAmount: number;
    refundAmount: number;
    commissionRefund: number;
    requestedBy: string;
  }): Promise<Refund> {
    try {
      // TODO: Implement actual refund processing when refund table exists
      // For now, return a mock refund object
      const refund: Refund = {
        id: `refund_${Date.now()}`,
        bookingId: refundData.bookingId,
        disputeId: refundData.disputeId,
        refundType: refundData.refundType,
        reason: refundData.reason,
        status: 'PENDING',
        originalAmount: refundData.originalAmount,
        refundAmount: refundData.refundAmount,
        commissionRefund: refundData.commissionRefund,
        processingFee: 0,
        netRefund: refundData.refundAmount,
        paymentMethod: 'CREDIT_CARD',
        requestedBy: refundData.requestedBy,
        customerNotified: false,
        timeline: [{
          status: 'PENDING',
          timestamp: new Date(),
          notes: 'Refund request created'
        }],
        createdAt: new Date(),
      };

      logger.info('Mock refund processed:', { refundId: refund.id });
      return refund;
    } catch (error) {
      logger.error('Error processing refund:', error);
      throw error;
    }
  }

  async getRefundStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<RefundStatistics> {
    try {
      // TODO: Implement when refund table exists
      return {
        totalRefunds: 0,
        totalRefundAmount: 0,
        averageProcessingTime: 0,
        refundsByType: {},
        refundsByReason: {},
        successRate: 0,
      };
    } catch (error) {
      logger.error('Error getting refund statistics:', error);
      throw error;
    }
  }
}

export const disputeRefundService = new DisputeRefundService();