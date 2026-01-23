import { Router, Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { authenticate } from '../middleware/auth.middleware';
import { logError } from '../utils/logging.utils';

const router = Router();

/**
 * Get all billing documents (invoices and receipts) for the authenticated user's company
 * GET /api/payments/billing
 */
router.get(
  '/billing',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found',
          },
        });
      }

      const documents = await paymentService.getCompanyBillingDocuments(req.user.companyId);

      res.json(documents);
    } catch (error) {
      logError({ error: error as Error, request: req });

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch billing documents',
        },
      });
    }
  }
);

/**
 * Get all transactions for the authenticated user's company
 * GET /api/payments/transactions
 */
router.get(
  '/transactions',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found',
          },
        });
      }

      const { startDate, endDate, type, status } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (type) filters.type = type;
      if (status) filters.status = status;

      const transactions = await paymentService.getCompanyTransactions(req.user.companyId, filters);

      res.json(transactions);
    } catch (error) {
      logError({ error: error as Error, request: req });

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch transactions',
        },
      });
    }
  }
);

/**
 * Download invoice PDF for a specific booking
 * GET /api/payments/invoices/:bookingId
 */
router.get(
  '/invoices/:bookingId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found',
          },
        });
      }

      const invoice = await paymentService.generateInvoice(req.params.bookingId);

      // Send the PDF file
      res.download(invoice.pdfPath, `invoice-${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      logError({ error: error as Error, request: req });

      const errorMessage = (error as Error).message;

      if (errorMessage === 'BOOKING_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: 'BOOKING_NOT_FOUND',
            message: 'Booking not found',
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to download invoice',
        },
      });
    }
  }
);

/**
 * Download receipt PDF for a specific booking
 * GET /api/payments/receipts/:bookingId
 */
router.get(
  '/receipts/:bookingId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found',
          },
        });
      }

      const receipt = await paymentService.generateReceipt(req.params.bookingId);

      // Send the PDF file
      res.download(receipt.pdfPath, `receipt-${receipt.receiptNumber}.pdf`);
    } catch (error) {
      logError({ error: error as Error, request: req });

      const errorMessage = (error as Error).message;

      if (errorMessage === 'BOOKING_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: 'BOOKING_NOT_FOUND',
            message: 'Booking not found',
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to download receipt',
        },
      });
    }
  }
);

export default router;
