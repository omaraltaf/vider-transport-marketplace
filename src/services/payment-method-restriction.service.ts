/**
 * Payment Method Restriction Service
 * Manages payment method availability and restrictions
 */

import { PrismaClient, PaymentMethodConfig, PaymentMethod, FeeType } from '@prisma/client';
import { getDatabaseClient } from '../config/database';
import { logError } from '../utils/logging.utils';

const prisma = getDatabaseClient();

export interface CreatePaymentMethodConfigRequest {
  paymentMethod: PaymentMethod;
  enabled: boolean;
  minAmount?: number;
  maxAmount?: number;
  processingFee?: number;
  processingFeeType?: FeeType;
  supportedRegions: string[];
  metadata?: Record<string, any>;
}

export interface UpdatePaymentMethodConfigRequest {
  enabled?: boolean;
  minAmount?: number;
  maxAmount?: number;
  processingFee?: number;
  processingFeeType?: FeeType;
  supportedRegions?: string[];
  metadata?: Record<string, any>;
}

export interface PaymentMethodQuery {
  paymentMethod?: PaymentMethod;
  enabled?: boolean;
  region?: string;
}

export interface PaymentValidationResult {
  allowed: boolean;
  reason?: string;
  suggestedMethods?: PaymentMethod[];
}

export interface PaymentMethodAvailability {
  paymentMethod: PaymentMethod;
  available: boolean;
  minAmount?: number;
  maxAmount?: number;
  processingFee?: number;
  processingFeeType?: FeeType;
  reason?: string;
}

export class PaymentMethodRestrictionService {
  /**
   * Create a new payment method configuration
   */
  async createPaymentMethodConfig(
    configId: string,
    data: CreatePaymentMethodConfigRequest
  ): Promise<PaymentMethodConfig> {
    try {
      const config = await prisma.paymentMethodConfig.create({
        data: {
          configId,
          ...data,
          metadata: data.metadata || {}
        }
      });

      return config;
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to create payment method configuration');
    }
  }

  /**
   * Get all payment method configurations
   */
  async getPaymentMethodConfigs(
    configId: string,
    query?: PaymentMethodQuery
  ): Promise<PaymentMethodConfig[]> {
    try {
      const where: any = { configId };

      if (query?.paymentMethod) {
        where.paymentMethod = query.paymentMethod;
      }
      if (query?.enabled !== undefined) {
        where.enabled = query.enabled;
      }
      if (query?.region) {
        where.supportedRegions = {
          has: query.region
        };
      }

      const configs = await prisma.paymentMethodConfig.findMany({
        where,
        orderBy: { paymentMethod: 'asc' }
      });

      return configs;
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to fetch payment method configurations');
    }
  }

  /**
   * Update a payment method configuration
   */
  async updatePaymentMethodConfig(
    configId: string,
    paymentMethod: PaymentMethod,
    data: UpdatePaymentMethodConfigRequest
  ): Promise<PaymentMethodConfig> {
    try {
      const config = await prisma.paymentMethodConfig.updateMany({
        where: {
          configId,
          paymentMethod
        },
        data
      });

      // Fetch and return the updated config
      const updatedConfig = await prisma.paymentMethodConfig.findFirst({
        where: {
          configId,
          paymentMethod
        }
      });

      if (!updatedConfig) {
        throw new Error('Payment method configuration not found after update');
      }

      return updatedConfig;
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to update payment method configuration');
    }
  }

  /**
   * Delete a payment method configuration
   */
  async deletePaymentMethodConfig(
    configId: string,
    paymentMethod: PaymentMethod
  ): Promise<void> {
    try {
      await prisma.paymentMethodConfig.deleteMany({
        where: {
          configId,
          paymentMethod
        }
      });
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to delete payment method configuration');
    }
  }

  /**
   * Check if a payment method is available for a region and amount
   */
  async isPaymentMethodAvailable(
    configId: string,
    paymentMethod: PaymentMethod,
    region: string,
    amount?: number
  ): Promise<PaymentValidationResult> {
    try {
      const config = await prisma.paymentMethodConfig.findFirst({
        where: {
          configId,
          paymentMethod,
          enabled: true
        }
      });

      if (!config) {
        return {
          allowed: false,
          reason: 'Payment method is not enabled'
        };
      }

      // Check region support
      if (!config.supportedRegions.includes(region)) {
        const availableMethods = await this.getAvailableMethodsForRegion(configId, region);
        return {
          allowed: false,
          reason: `Payment method not supported in region: ${region}`,
          suggestedMethods: availableMethods.map(m => m.paymentMethod)
        };
      }

      // Check amount limits
      if (amount !== undefined) {
        if (config.minAmount && amount < config.minAmount) {
          return {
            allowed: false,
            reason: `Amount ${amount} is below minimum ${config.minAmount}`
          };
        }

        if (config.maxAmount && amount > config.maxAmount) {
          return {
            allowed: false,
            reason: `Amount ${amount} exceeds maximum ${config.maxAmount}`
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      logError({ error: error as Error });
      return {
        allowed: false,
        reason: 'Error validating payment method'
      };
    }
  }

  /**
   * Get available payment methods for a specific region
   */
  async getAvailableMethodsForRegion(
    configId: string,
    region: string,
    amount?: number
  ): Promise<PaymentMethodAvailability[]> {
    try {
      const configs = await prisma.paymentMethodConfig.findMany({
        where: {
          configId,
          enabled: true,
          supportedRegions: {
            has: region
          }
        }
      });

      const availableMethods: PaymentMethodAvailability[] = [];

      for (const config of configs) {
        let available = true;
        let reason: string | undefined;

        // Check amount limits
        if (amount !== undefined) {
          if (config.minAmount && amount < config.minAmount) {
            available = false;
            reason = `Amount below minimum ${config.minAmount}`;
          } else if (config.maxAmount && amount > config.maxAmount) {
            available = false;
            reason = `Amount exceeds maximum ${config.maxAmount}`;
          }
        }

        availableMethods.push({
          paymentMethod: config.paymentMethod,
          available,
          minAmount: config.minAmount || undefined,
          maxAmount: config.maxAmount || undefined,
          processingFee: config.processingFee || undefined,
          processingFeeType: config.processingFeeType,
          reason
        });
      }

      return availableMethods;
    } catch (error) {
      logError({ error: error as Error });
      return [];
    }
  }

  /**
   * Calculate processing fee for a payment method
   */
  async calculateProcessingFee(
    configId: string,
    paymentMethod: PaymentMethod,
    amount: number
  ): Promise<number> {
    try {
      const config = await prisma.paymentMethodConfig.findFirst({
        where: {
          configId,
          paymentMethod,
          enabled: true
        }
      });

      if (!config || !config.processingFee) {
        return 0;
      }

      if (config.processingFeeType === FeeType.PERCENTAGE) {
        return amount * (config.processingFee / 100);
      } else {
        return config.processingFee;
      }
    } catch (error) {
      logError({ error: error as Error });
      return 0;
    }
  }

  /**
   * Bulk update payment method configurations
   */
  async bulkUpdatePaymentMethods(
    configId: string,
    updates: Array<{
      paymentMethod: PaymentMethod;
      data: UpdatePaymentMethodConfigRequest;
    }>
  ): Promise<PaymentMethodConfig[]> {
    try {
      const updatedConfigs = await prisma.$transaction(
        updates.map(update =>
          prisma.paymentMethodConfig.updateMany({
            where: {
              configId,
              paymentMethod: update.paymentMethod
            },
            data: update.data
          })
        )
      );

      // Fetch all updated configurations
      const configs = await prisma.paymentMethodConfig.findMany({
        where: {
          configId,
          paymentMethod: {
            in: updates.map(u => u.paymentMethod)
          }
        }
      });

      return configs;
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to bulk update payment method configurations');
    }
  }

  /**
   * Enable/disable payment method for specific regions
   */
  async updateRegionSupport(
    configId: string,
    paymentMethod: PaymentMethod,
    regionsToAdd: string[],
    regionsToRemove: string[]
  ): Promise<PaymentMethodConfig> {
    try {
      const config = await prisma.paymentMethodConfig.findFirst({
        where: {
          configId,
          paymentMethod
        }
      });

      if (!config) {
        throw new Error('Payment method configuration not found');
      }

      let updatedRegions = [...config.supportedRegions];

      // Add new regions
      regionsToAdd.forEach(region => {
        if (!updatedRegions.includes(region)) {
          updatedRegions.push(region);
        }
      });

      // Remove regions
      updatedRegions = updatedRegions.filter(region => 
        !regionsToRemove.includes(region)
      );

      const updatedConfig = await prisma.paymentMethodConfig.update({
        where: { id: config.id },
        data: {
          supportedRegions: updatedRegions
        }
      });

      return updatedConfig;
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to update region support');
    }
  }

  /**
   * Get payment method statistics
   */
  async getPaymentMethodStats(configId: string): Promise<{
    totalMethods: number;
    enabledMethods: number;
    methodsByRegion: Record<string, PaymentMethod[]>;
    averageProcessingFees: Record<PaymentMethod, number>;
  }> {
    try {
      const configs = await prisma.paymentMethodConfig.findMany({
        where: { configId }
      });

      const totalMethods = configs.length;
      const enabledMethods = configs.filter(c => c.enabled).length;

      // Group methods by region
      const methodsByRegion: Record<string, PaymentMethod[]> = {};
      configs.forEach(config => {
        if (config.enabled) {
          config.supportedRegions.forEach(region => {
            if (!methodsByRegion[region]) {
              methodsByRegion[region] = [];
            }
            methodsByRegion[region].push(config.paymentMethod);
          });
        }
      });

      // Calculate average processing fees
      const averageProcessingFees: Record<PaymentMethod, number> = {} as any;
      configs.forEach(config => {
        if (config.processingFee) {
          averageProcessingFees[config.paymentMethod] = config.processingFee;
        }
      });

      return {
        totalMethods,
        enabledMethods,
        methodsByRegion,
        averageProcessingFees
      };
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to get payment method statistics');
    }
  }

  /**
   * Validate payment method configuration
   */
  validatePaymentMethodConfig(data: CreatePaymentMethodConfigRequest): string[] {
    const errors: string[] = [];

    if (data.minAmount && data.maxAmount && data.minAmount > data.maxAmount) {
      errors.push('Minimum amount cannot be greater than maximum amount');
    }

    if (data.processingFee && data.processingFee < 0) {
      errors.push('Processing fee cannot be negative');
    }

    if (data.processingFeeType === FeeType.PERCENTAGE && data.processingFee && data.processingFee > 100) {
      errors.push('Percentage processing fee cannot exceed 100%');
    }

    if (!data.supportedRegions || data.supportedRegions.length === 0) {
      errors.push('At least one supported region must be specified');
    }

    return errors;
  }
}

// Create and export service instance
export const paymentMethodRestrictionService = new PaymentMethodRestrictionService();