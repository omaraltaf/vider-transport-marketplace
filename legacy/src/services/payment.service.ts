import { PrismaClient, TransactionType, TransactionStatus } from '@prisma/client';
import type { Booking, Transaction } from '@prisma/client';
import { logger } from '../config/logger';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export interface Invoice {
  id: string;
  bookingId: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  providerCompany: {
    name: string;
    organizationNumber: string;
    businessAddress: string;
    city: string;
    postalCode: string;
  };
  renterCompany: {
    name: string;
    organizationNumber: string;
    businessAddress: string;
    city: string;
    postalCode: string;
  };
  lineItems: LineItem[];
  subtotal: number;
  commission: number;
  taxes: number;
  total: number;
  pdfPath: string;
}

export interface Receipt {
  id: string;
  bookingId: string;
  receiptNumber: string;
  issueDate: Date;
  providerCompany: {
    name: string;
    organizationNumber: string;
  };
  renterCompany: {
    name: string;
    organizationNumber: string;
  };
  subtotal: number;
  commission: number;
  taxes: number;
  total: number;
  pdfPath: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  type?: TransactionType;
  status?: TransactionStatus;
}

export interface RevenueReport {
  totalRevenue: number;
  totalCommission: number;
  totalTransactions: number;
  currency: string;
  startDate: Date;
  endDate: Date;
}

export class PaymentService {
  /**
   * Generate an invoice for a booking
   * Called when booking is confirmed (status changes to ACCEPTED)
   */
  async generateInvoice(bookingId: string): Promise<Invoice> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        renterCompany: true,
        providerCompany: true,
        vehicleListing: true,
        driverListing: true,
      },
    });

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Calculate due date (30 days from issue)
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);

    // Build line items
    const lineItems: LineItem[] = [];

    if (booking.vehicleListing) {
      const vehicleRate = booking.vehicleListingId ? 
        await this.calculateListingRate(booking.vehicleListingId, 'vehicle', booking) : 0;
      
      lineItems.push({
        description: `Vehicle Rental: ${booking.vehicleListing.title}`,
        quantity: booking.durationDays || booking.durationHours || 1,
        unitPrice: vehicleRate / (booking.durationDays || booking.durationHours || 1),
        total: vehicleRate,
      });
    }

    if (booking.driverListing) {
      const driverRate = booking.driverListingId ?
        await this.calculateListingRate(booking.driverListingId, 'driver', booking) : 0;
      
      lineItems.push({
        description: `Driver Service: ${booking.driverListing.name}`,
        quantity: booking.durationDays || booking.durationHours || 1,
        unitPrice: driverRate / (booking.durationDays || booking.durationHours || 1),
        total: driverRate,
      });
    }

    // Generate PDF
    const pdfPath = await this.generateInvoicePDF(booking, invoiceNumber, issueDate, dueDate, lineItems);

    const invoice: Invoice = {
      id: booking.id,
      bookingId: booking.id,
      invoiceNumber,
      issueDate,
      dueDate,
      providerCompany: {
        name: booking.providerCompany.name,
        organizationNumber: booking.providerCompany.organizationNumber,
        businessAddress: booking.providerCompany.businessAddress,
        city: booking.providerCompany.city,
        postalCode: booking.providerCompany.postalCode,
      },
      renterCompany: {
        name: booking.renterCompany.name,
        organizationNumber: booking.renterCompany.organizationNumber,
        businessAddress: booking.renterCompany.businessAddress,
        city: booking.renterCompany.city,
        postalCode: booking.renterCompany.postalCode,
      },
      lineItems,
      subtotal: booking.providerRate,
      commission: booking.platformCommission,
      taxes: booking.taxes,
      total: booking.total,
      pdfPath,
    };

    logger.info('Invoice generated', { bookingId, invoiceNumber, total: booking.total });

    return invoice;
  }

  /**
   * Calculate the rate for a specific listing in a booking
   */
  private async calculateListingRate(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    booking: any
  ): Promise<number> {
    if (listingType === 'vehicle') {
      const listing = await prisma.vehicleListing.findUnique({
        where: { id: listingId },
      });

      if (!listing) return 0;

      if (booking.durationHours && listing.hourlyRate) {
        return listing.hourlyRate * booking.durationHours;
      } else if (booking.durationDays && listing.dailyRate) {
        return listing.dailyRate * booking.durationDays;
      }
    } else {
      const listing = await prisma.driverListing.findUnique({
        where: { id: listingId },
      });

      if (!listing) return 0;

      if (booking.durationHours && listing.hourlyRate) {
        return listing.hourlyRate * booking.durationHours;
      } else if (booking.durationDays && listing.dailyRate) {
        return listing.dailyRate * booking.durationDays;
      }
    }

    return 0;
  }

  /**
   * Generate a receipt for a completed booking
   * Called when booking status changes to COMPLETED
   */
  async generateReceipt(bookingId: string): Promise<Receipt> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        renterCompany: true,
        providerCompany: true,
        vehicleListing: true,
        driverListing: true,
      },
    });

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    // Generate receipt number
    const receiptNumber = await this.generateReceiptNumber();
    const issueDate = new Date();

    // Generate PDF
    const pdfPath = await this.generateReceiptPDF(booking, receiptNumber, issueDate);

    const receipt: Receipt = {
      id: booking.id,
      bookingId: booking.id,
      receiptNumber,
      issueDate,
      providerCompany: {
        name: booking.providerCompany.name,
        organizationNumber: booking.providerCompany.organizationNumber,
      },
      renterCompany: {
        name: booking.renterCompany.name,
        organizationNumber: booking.renterCompany.organizationNumber,
      },
      subtotal: booking.providerRate,
      commission: booking.platformCommission,
      taxes: booking.taxes,
      total: booking.total,
      pdfPath,
    };

    logger.info('Receipt generated', { bookingId, receiptNumber, total: booking.total });

    return receipt;
  }

  /**
   * Record a transaction
   */
  async recordTransaction(
    bookingId: string,
    amount: number,
    type: TransactionType,
    metadata?: Record<string, any>
  ): Promise<Transaction> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    const transaction = await prisma.transaction.create({
      data: {
        bookingId,
        type,
        amount,
        currency: booking.currency,
        status: TransactionStatus.PENDING,
        metadata: metadata || {},
      },
    });

    logger.info('Transaction recorded', { 
      transactionId: transaction.id, 
      bookingId, 
      type, 
      amount 
    });

    return transaction;
  }

  /**
   * Get all transactions for a company
   */
  async getCompanyTransactions(
    companyId: string,
    filters?: TransactionFilters
  ): Promise<Transaction[]> {
    // Get all bookings for the company (as renter or provider)
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { renterCompanyId: companyId },
          { providerCompanyId: companyId },
        ],
      },
      select: { id: true },
    });

    const bookingIds = bookings.map(b => b.id);

    const where: any = {
      bookingId: {
        in: bookingIds,
      },
    };

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        booking: {
          include: {
            renterCompany: true,
            providerCompany: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return transactions;
  }

  /**
   * Calculate platform revenue for a time period
   * Revenue = sum of all commission amounts from completed bookings
   */
  async calculatePlatformRevenue(startDate: Date, endDate: Date): Promise<RevenueReport> {
    // Get all bookings completed in the time period
    const bookings = await prisma.booking.findMany({
      where: {
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalCommission = bookings.reduce((sum, booking) => sum + booking.platformCommission, 0);
    const totalRevenue = totalCommission; // Platform revenue is the commission
    const currency = bookings.length > 0 ? bookings[0].currency : 'NOK';

    logger.info('Platform revenue calculated', {
      startDate,
      endDate,
      totalRevenue,
      totalCommission,
      bookingCount: bookings.length,
    });

    return {
      totalRevenue,
      totalCommission,
      totalTransactions: bookings.length,
      currency,
      startDate,
      endDate,
    };
  }

  /**
   * Get all invoices and receipts for a company (billing page)
   */
  async getCompanyBillingDocuments(companyId: string): Promise<{
    invoices: string[];
    receipts: string[];
  }> {
    // Get all bookings for the company
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { renterCompanyId: companyId },
          { providerCompanyId: companyId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    const invoicesDir = path.join(process.cwd(), 'uploads', 'invoices');
    const receiptsDir = path.join(process.cwd(), 'uploads', 'receipts');

    const invoices: string[] = [];
    const receipts: string[] = [];

    // Collect invoice paths
    for (const booking of bookings) {
      const invoicePattern = `invoice-${booking.bookingNumber}`;
      if (fs.existsSync(invoicesDir)) {
        const files = fs.readdirSync(invoicesDir);
        const matchingInvoices = files.filter(f => f.startsWith(invoicePattern));
        invoices.push(...matchingInvoices.map(f => path.join(invoicesDir, f)));
      }

      const receiptPattern = `receipt-${booking.bookingNumber}`;
      if (fs.existsSync(receiptsDir)) {
        const files = fs.readdirSync(receiptsDir);
        const matchingReceipts = files.filter(f => f.startsWith(receiptPattern));
        receipts.push(...matchingReceipts.map(f => path.join(receiptsDir, f)));
      }
    }

    return { invoices, receipts };
  }

  /**
   * Generate invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${timestamp}-${random}`;
  }

  /**
   * Generate receipt number
   */
  private async generateReceiptNumber(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `REC-${timestamp}-${random}`;
  }

  /**
   * Generate invoice PDF
   */
  private async generateInvoicePDF(
    booking: any,
    invoiceNumber: string,
    issueDate: Date,
    dueDate: Date,
    lineItems: LineItem[]
  ): Promise<string> {
    // Ensure invoices directory exists
    const invoicesDir = path.join(process.cwd(), 'uploads', 'invoices');
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    // Generate filename
    const filename = `invoice-${booking.bookingNumber}-${Date.now()}.pdf`;
    const filepath = path.join(invoicesDir, filename);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // Header
        doc.fontSize(24).text('INVOICE', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Invoice Number: ${invoiceNumber}`, { align: 'center' });
        doc.text(`Booking Number: ${booking.bookingNumber}`, { align: 'center' });
        doc.moveDown(2);

        // Dates
        doc.fontSize(10);
        doc.text(`Issue Date: ${issueDate.toLocaleDateString()}`);
        doc.text(`Due Date: ${dueDate.toLocaleDateString()}`);
        doc.moveDown(2);

        // Provider (From)
        doc.fontSize(14).text('From:', { underline: true });
        doc.fontSize(10);
        doc.text(booking.providerCompany.name);
        doc.text(`Org. Nr: ${booking.providerCompany.organizationNumber}`);
        doc.text(booking.providerCompany.businessAddress);
        doc.text(`${booking.providerCompany.postalCode} ${booking.providerCompany.city}`);
        doc.moveDown();

        // Renter (To)
        doc.fontSize(14).text('To:', { underline: true });
        doc.fontSize(10);
        doc.text(booking.renterCompany.name);
        doc.text(`Org. Nr: ${booking.renterCompany.organizationNumber}`);
        doc.text(booking.renterCompany.businessAddress);
        doc.text(`${booking.renterCompany.postalCode} ${booking.renterCompany.city}`);
        doc.moveDown(2);

        // Rental Period
        doc.fontSize(14).text('Rental Period:', { underline: true });
        doc.fontSize(10);
        doc.text(`From: ${booking.startDate.toLocaleDateString()}`);
        doc.text(`To: ${booking.endDate.toLocaleDateString()}`);
        if (booking.durationDays) {
          doc.text(`Duration: ${booking.durationDays} days`);
        } else if (booking.durationHours) {
          doc.text(`Duration: ${booking.durationHours} hours`);
        }
        doc.moveDown(2);

        // Line Items
        doc.fontSize(14).text('Items:', { underline: true });
        doc.moveDown(0.5);

        // Table header
        doc.fontSize(10);
        const tableTop = doc.y;
        doc.text('Description', 50, tableTop, { width: 250 });
        doc.text('Qty', 300, tableTop, { width: 50 });
        doc.text('Unit Price', 350, tableTop, { width: 80, align: 'right' });
        doc.text('Total', 430, tableTop, { width: 100, align: 'right' });
        
        doc.moveTo(50, doc.y + 5).lineTo(530, doc.y + 5).stroke();
        doc.moveDown();

        // Line items
        lineItems.forEach(item => {
          const y = doc.y;
          doc.text(item.description, 50, y, { width: 250 });
          doc.text(item.quantity.toString(), 300, y, { width: 50 });
          doc.text(item.unitPrice.toFixed(2), 350, y, { width: 80, align: 'right' });
          doc.text(item.total.toFixed(2), 430, y, { width: 100, align: 'right' });
          doc.moveDown();
        });

        doc.moveDown();

        // Financial Summary
        const summaryX = 350;
        doc.fontSize(10);
        doc.text('Subtotal:', summaryX, doc.y, { width: 80, align: 'right' });
        doc.text(`${booking.providerRate.toFixed(2)} ${booking.currency}`, 430, doc.y - 12, { width: 100, align: 'right' });
        
        doc.text(`Platform Fee (${booking.platformCommissionRate}%):`, summaryX, doc.y, { width: 80, align: 'right' });
        doc.text(`${booking.platformCommission.toFixed(2)} ${booking.currency}`, 430, doc.y - 12, { width: 100, align: 'right' });
        
        doc.text(`Tax (${booking.taxRate}%):`, summaryX, doc.y, { width: 80, align: 'right' });
        doc.text(`${booking.taxes.toFixed(2)} ${booking.currency}`, 430, doc.y - 12, { width: 100, align: 'right' });
        
        doc.moveDown();
        doc.fontSize(12);
        doc.text('Total:', summaryX, doc.y, { width: 80, align: 'right', underline: true });
        doc.text(`${booking.total.toFixed(2)} ${booking.currency}`, 430, doc.y - 14, { width: 100, align: 'right', underline: true });
        
        doc.moveDown(2);

        // Payment Terms
        doc.fontSize(10);
        doc.text('Payment Terms:', { underline: true });
        doc.text('Payment is due within 30 days of invoice date.');
        doc.text('Please reference the invoice number when making payment.');
        doc.moveDown(2);

        // Footer
        doc.fontSize(8);
        doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.text('Vider Transport Marketplace', { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          logger.info('Invoice PDF generated', { bookingId: booking.id, filepath });
          resolve(filepath);
        });

        stream.on('error', (error) => {
          logger.error('Error generating invoice PDF', { bookingId: booking.id, error });
          reject(error);
        });
      } catch (error) {
        logger.error('Error creating invoice PDF document', { bookingId: booking.id, error });
        reject(error);
      }
    });
  }

  /**
   * Generate receipt PDF
   */
  private async generateReceiptPDF(
    booking: any,
    receiptNumber: string,
    issueDate: Date
  ): Promise<string> {
    // Ensure receipts directory exists
    const receiptsDir = path.join(process.cwd(), 'uploads', 'receipts');
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }

    // Generate filename
    const filename = `receipt-${booking.bookingNumber}-${Date.now()}.pdf`;
    const filepath = path.join(receiptsDir, filename);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // Header
        doc.fontSize(24).text('RECEIPT', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Receipt Number: ${receiptNumber}`, { align: 'center' });
        doc.text(`Booking Number: ${booking.bookingNumber}`, { align: 'center' });
        doc.moveDown(2);

        // Date
        doc.fontSize(10);
        doc.text(`Date: ${issueDate.toLocaleDateString()}`);
        doc.moveDown(2);

        // Provider
        doc.fontSize(14).text('Provider:', { underline: true });
        doc.fontSize(10);
        doc.text(booking.providerCompany.name);
        doc.text(`Org. Nr: ${booking.providerCompany.organizationNumber}`);
        doc.moveDown();

        // Renter
        doc.fontSize(14).text('Renter:', { underline: true });
        doc.fontSize(10);
        doc.text(booking.renterCompany.name);
        doc.text(`Org. Nr: ${booking.renterCompany.organizationNumber}`);
        doc.moveDown(2);

        // Rental Details
        doc.fontSize(14).text('Rental Details:', { underline: true });
        doc.fontSize(10);
        
        if (booking.vehicleListing) {
          doc.text(`Vehicle: ${booking.vehicleListing.title}`);
        }
        
        if (booking.driverListing) {
          doc.text(`Driver: ${booking.driverListing.name}`);
        }

        doc.text(`Period: ${booking.startDate.toLocaleDateString()} - ${booking.endDate.toLocaleDateString()}`);
        
        if (booking.durationDays) {
          doc.text(`Duration: ${booking.durationDays} days`);
        } else if (booking.durationHours) {
          doc.text(`Duration: ${booking.durationHours} hours`);
        }
        doc.moveDown(2);

        // Payment Summary
        doc.fontSize(14).text('Payment Summary:', { underline: true });
        doc.fontSize(10);
        
        const summaryX = 350;
        doc.text('Subtotal:', summaryX, doc.y, { width: 80, align: 'right' });
        doc.text(`${booking.providerRate.toFixed(2)} ${booking.currency}`, 430, doc.y - 12, { width: 100, align: 'right' });
        
        doc.text(`Platform Fee (${booking.platformCommissionRate}%):`, summaryX, doc.y, { width: 80, align: 'right' });
        doc.text(`${booking.platformCommission.toFixed(2)} ${booking.currency}`, 430, doc.y - 12, { width: 100, align: 'right' });
        
        doc.text(`Tax (${booking.taxRate}%):`, summaryX, doc.y, { width: 80, align: 'right' });
        doc.text(`${booking.taxes.toFixed(2)} ${booking.currency}`, 430, doc.y - 12, { width: 100, align: 'right' });
        
        doc.moveDown();
        doc.fontSize(12);
        doc.text('Total Paid:', summaryX, doc.y, { width: 80, align: 'right', underline: true });
        doc.text(`${booking.total.toFixed(2)} ${booking.currency}`, 430, doc.y - 14, { width: 100, align: 'right', underline: true });
        
        doc.moveDown(3);

        // Confirmation
        doc.fontSize(10);
        doc.text('This receipt confirms that the rental has been completed and payment has been processed.', { align: 'center' });
        doc.moveDown(2);

        // Footer
        doc.fontSize(8);
        doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.text('Vider Transport Marketplace', { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          logger.info('Receipt PDF generated', { bookingId: booking.id, filepath });
          resolve(filepath);
        });

        stream.on('error', (error) => {
          logger.error('Error generating receipt PDF', { bookingId: booking.id, error });
          reject(error);
        });
      } catch (error) {
        logger.error('Error creating receipt PDF document', { bookingId: booking.id, error });
        reject(error);
      }
    });
  }
}

export const paymentService = new PaymentService();
