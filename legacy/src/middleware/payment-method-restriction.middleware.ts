/**
 * Payment Method Restriction Middleware
 * Enforces payment method availability and restrictions
 */

import { Request, Response, NextFunction } from 'express';
import { PaymentMethod } from '@prisma/client';
import { paymentMethodRestrictionService } from '../services/payment-method-restriction.service';
import { platformConfigService } from '../services/platform-config.service';
import { restrictionMonitoringService } from '../services/restriction-monitoring.service';
import { logError } from '../utils/logging.utils';

export interface PaymentMethodRestrictionOptions {
  paymentMethodExtractor?: (req: Request) => PaymentMethod | null;
  regionExtractor?: (req: Request) => string | null;
  amountExtractor?: (req: Request) => number | null;
  fallbackResponse?: any;
  allowBypass?: boolean;
}

/**
 * Default payment method extractor
 */
function defaultPaymentMethodExtractor(req: Request): PaymentMethod | null {
  // Try to get payment method from request body
  if (req.body?.paymentMethod) {
    return req.body.paymentMethod as PaymentMethod;
  }

  // Try to get from query parameters
  if (req.query?.paymentMethod) {
    return req.query.paymentMethod as PaymentMethod;
  }

  return null;
}

/**
 * Default region extractor
 */
function defaultRegionExtractor(req: Request): string | null {
  // Try to get region from request body
  if (req.body?.region) {
    return req.body.region;
  }

  // Try to get from query parameters
  if (req.query?.region) {
    return req.query.region as string;
  }

  // Try to get from user profile
  if (req.user && (req.user as any).region) {
    return (req.user as any).region;
  }

  // Default to Norway for now (in real implementation, use GeoIP)
  return 'Norway';
}

/**
 * Default amount extractor
 */
function defaultAmountExtractor(req: Request): number | null {
  // Try to get amount from request body
  if (req.body?.amount && typeof req.body.amount === 'number') {
    return req.body.amount;
  }

  if (req.body?.totalAmount && typeof req.body.totalAmount === 'number') {
    return req.body.totalAmount;
  }

  // Try to get from query parameters
  if (req.query?.amount) {
    const amount = parseFloat(req.query.amount as string);
    return isNaN(amount) ? null : amount;
  }

  return null;
}

/**
 * Middleware to enforce payment method restrictions
 */
export function requirePaymentMethodAccess(options: PaymentMethodRestrictionOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await platformConfigService.getConfiguration();
      
      if (!config) {
        return res.status(503).json({
          error: {
            code: 'CONFIGURATION_UNAVAILABLE',
            message: 'Platform configuration is not available',
          },
        });
      }

      // Extract payment information
      const paymentMethodExtractor = options.paymentMethodExtractor || defaultPaymentMethodExtractor;
      const regionExtractor = options.regionExtractor || defaultRegionExtractor;
      const amountExtractor = options.amountExtractor || defaultAmountExtractor;

      const paymentMethod = paymentMethodExtractor(req);
      const region = regionExtractor(req);
      const amount = amountExtractor(req);

      if (!paymentMethod) {
        if (options.allowBypass) {
          return next();
        }
        
        return res.status(400).json({
          error: {
            code: 'PAYMENT_METHOD_REQUIRED',
            message: 'Payment method is required for this operation',
          },
        });
      }

      if (!region) {
        if (options.allowBypass) {
          return next();
        }
        
        return res.status(400).json({
          error: {
            code: 'REGION_REQUIRED',
            message: 'Region information is required for payment validation',
          },
        });
      }

      // Check if payment method is available
      const validationResult = await paymentMethodRestrictionService.isPaymentMethodAvailable(
        config.id,
        paymentMethod,
        region,
        amount || undefined
      );

      if (!validationResult.allowed) {
        // Log the violation using monitoring service
        await restrictionMonitoringService.logViolation({
          type: 'payment_method',
          userId: (req.user as any)?.id,
          sessionId: req.session?.id || 'no-session',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          region,
          paymentMethod,
          attemptedAction: `${req.method} ${req.path}`,
          endpoint: req.originalUrl,
          blocked: true,
          reason: validationResult.reason || 'Payment method not available',
          metadata: {
            amount,
            suggestedMethods: validationResult.suggestedMethods,
            headers: req.headers,
            query: req.query,
            body: req.body
          }
        });

        if (options.fallbackResponse) {
          return res.status(200).json(options.fallbackResponse);
        }

        return res.status(403).json({
          error: {
            code: 'PAYMENT_METHOD_RESTRICTED',
            message: validationResult.reason || 'Payment method is not available',
            paymentMethod,
            region,
            amount,
            suggestedMethods: validationResult.suggestedMethods,
          },
        });
      }

      // Add payment info to request for downstream use
      (req as any).paymentInfo = {
        paymentMethod,
        region,
        amount
      };

      next();
    } catch (error) {
      logError({ error: error as Error, request: req });
      
      if (options.allowBypass) {
        next();
      } else {
        res.status(500).json({
          error: {
            code: 'PAYMENT_METHOD_CHECK_FAILED',
            message: 'Unable to verify payment method availability',
          },
        });
      }
    }
  };
}

/**
 * Middleware to validate payment amount limits
 */
export function validatePaymentAmount(options: PaymentMethodRestrictionOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await platformConfigService.getConfiguration();
      
      if (!config) {
        return res.status(503).json({
          error: {
            code: 'CONFIGURATION_UNAVAILABLE',
            message: 'Platform configuration is not available',
          },
        });
      }

      const paymentMethodExtractor = options.paymentMethodExtractor || defaultPaymentMethodExtractor;
      const regionExtractor = options.regionExtractor || defaultRegionExtractor;
      const amountExtractor = options.amountExtractor || defaultAmountExtractor;

      const paymentMethod = paymentMethodExtractor(req);
      const region = regionExtractor(req);
      const amount = amountExtractor(req);

      if (!paymentMethod || !region || amount === null) {
        if (options.allowBypass) {
          return next();
        }
        
        return res.status(400).json({
          error: {
            code: 'PAYMENT_VALIDATION_INCOMPLETE',
            message: 'Payment method, region, and amount are required for validation',
          },
        });
      }

      const validationResult = await paymentMethodRestrictionService.isPaymentMethodAvailable(
        config.id,
        paymentMethod,
        region,
        amount
      );

      if (!validationResult.allowed) {
        return res.status(400).json({
          error: {
            code: 'PAYMENT_AMOUNT_INVALID',
            message: validationResult.reason || 'Payment amount is not valid for this method',
            paymentMethod,
            region,
            amount,
          },
        });
      }

      // Calculate processing fee and add to request
      const processingFee = await paymentMethodRestrictionService.calculateProcessingFee(
        config.id,
        paymentMethod,
        amount
      );

      (req as any).paymentInfo = {
        ...(req as any).paymentInfo,
        processingFee,
        totalAmount: amount + processingFee
      };

      next();
    } catch (error) {
      logError({ error: error as Error, request: req });
      
      if (options.allowBypass) {
        next();
      } else {
        res.status(500).json({
          error: {
            code: 'PAYMENT_AMOUNT_VALIDATION_FAILED',
            message: 'Unable to validate payment amount',
          },
        });
      }
    }
  };
}

/**
 * Utility function to check payment method availability (for use in services)
 */
export async function checkPaymentMethodAvailability(
  paymentMethod: PaymentMethod,
  region: string,
  amount?: number
): Promise<{ allowed: boolean; reason?: string; processingFee?: number }> {
  try {
    const config = await platformConfigService.getConfiguration();
    if (!config) {
      return { allowed: false, reason: 'Configuration unavailable' };
    }

    const validationResult = await paymentMethodRestrictionService.isPaymentMethodAvailable(
      config.id,
      paymentMethod,
      region,
      amount
    );

    if (!validationResult.allowed) {
      return validationResult;
    }

    // Calculate processing fee if amount is provided
    let processingFee: number | undefined;
    if (amount !== undefined) {
      processingFee = await paymentMethodRestrictionService.calculateProcessingFee(
        config.id,
        paymentMethod,
        amount
      );
    }

    return {
      allowed: true,
      processingFee
    };
  } catch (error) {
    console.error('Error checking payment method availability:', error);
    return { allowed: false, reason: 'Validation error' };
  }
}

/**
 * Utility function to get available payment methods for a region
 */
export async function getAvailablePaymentMethods(region: string, amount?: number): Promise<Array<{
  paymentMethod: PaymentMethod;
  processingFee?: number;
  minAmount?: number;
  maxAmount?: number;
}>> {
  try {
    const config = await platformConfigService.getConfiguration();
    if (!config) {
      return [];
    }

    const availableMethods = await paymentMethodRestrictionService.getAvailableMethodsForRegion(
      config.id,
      region,
      amount
    );

    return availableMethods
      .filter(method => method.available)
      .map(method => ({
        paymentMethod: method.paymentMethod,
        processingFee: method.processingFee,
        minAmount: method.minAmount,
        maxAmount: method.maxAmount
      }));
  } catch (error) {
    console.error('Error getting available payment methods:', error);
    return [];
  }
}