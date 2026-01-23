import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient, BookingStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { PaymentService } from './payment.service';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const paymentService = new PaymentService();

describe('PaymentService', () => {
  // Clean up test data after each test
  afterEach(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.vehicleListing.deleteMany({});
    await prisma.driverListing.deleteMany({});
    await prisma.company.deleteMany({});
    await prisma.user.deleteMany({});
    
    // Clean up test PDF files
    const invoicesDir = path.join(process.cwd(), 'uploads', 'invoices');
    const receiptsDir = path.join(process.cwd(), 'uploads', 'receipts');
    
    if (fs.existsSync(invoicesDir)) {
      const files = fs.readdirSync(invoicesDir);
      files.forEach(file => {
        if (file.startsWith('invoice-BK-')) {
          fs.unlinkSync(path.join(invoicesDir, file));
        }
      });
    }
    
    if (fs.existsSync(receiptsDir)) {
      const files = fs.readdirSync(receiptsDir);
      files.forEach(file => {
        if (file.startsWith('receipt-BK-')) {
          fs.unlinkSync(path.join(receiptsDir, file));
        }
      });
    }
  });

  /**
   * **Feature: vider-transport-marketplace, Property 23: Invoice generation on confirmation**
   * **Validates: Requirements 11.1, 11.4**
   * 
   * Property: For any booking that transitions to Accepted status, the system must generate 
   * a PDF invoice containing all required financial details (Provider Rate, Commission, Taxes, 
   * Total, Payment Terms).
   */
  describe('Property 23: Invoice generation on confirmation', () => {
    it('should generate invoice with all required financial details for any accepted booking', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random booking data
          fc.record({
            providerRate: fc.float({ min: 100, max: 10000, noNaN: true }),
            commissionRate: fc.float({ min: 1, max: 20, noNaN: true }),
            taxRate: fc.float({ min: 10, max: 30, noNaN: true }),
            durationDays: fc.integer({ min: 1, max: 30 }),
            vehicleTitle: fc.string({ minLength: 5, maxLength: 50 }),
            companyName1: fc.string({ minLength: 3, maxLength: 30 }),
            companyName2: fc.string({ minLength: 3, maxLength: 30 }),
          }),
          async (data) => {
            // Create test companies
            const providerCompany = await prisma.company.create({
              data: {
                name: data.companyName1,
                organizationNumber: `${Math.floor(Math.random() * 900000000) + 100000000}`,
                businessAddress: 'Test Address 1',
                city: 'Oslo',
                postalCode: '0001',
                fylke: 'Oslo',
                kommune: 'Oslo',
                vatRegistered: true,
              },
            });

            const renterCompany = await prisma.company.create({
              data: {
                name: data.companyName2,
                organizationNumber: `${Math.floor(Math.random() * 900000000) + 100000000}`,
                businessAddress: 'Test Address 2',
                city: 'Bergen',
                postalCode: '5001',
                fylke: 'Vestland',
                kommune: 'Bergen',
                vatRegistered: true,
              },
            });

            // Create vehicle listing
            const vehicleListing = await prisma.vehicleListing.create({
              data: {
                companyId: providerCompany.id,
                title: data.vehicleTitle,
                description: 'Test vehicle',
                vehicleType: 'PALLET_18',
                capacity: 18,
                fuelType: 'DIESEL',
                city: 'Oslo',
                fylke: 'Oslo',
                kommune: 'Oslo',
                dailyRate: data.providerRate / data.durationDays,
                currency: 'NOK',
                withDriver: false,
                withoutDriver: true,
                photos: [],
                tags: [],
              },
            });

            // Calculate costs
            const platformCommission = data.providerRate * (data.commissionRate / 100);
            const subtotal = data.providerRate + platformCommission;
            const taxes = subtotal * (data.taxRate / 100);
            const total = subtotal + taxes;

            // Create booking in ACCEPTED status
            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + data.durationDays);

            const booking = await prisma.booking.create({
              data: {
                bookingNumber: `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                renterCompanyId: renterCompany.id,
                providerCompanyId: providerCompany.id,
                vehicleListingId: vehicleListing.id,
                status: BookingStatus.ACCEPTED,
                startDate,
                endDate,
                durationDays: data.durationDays,
                providerRate: data.providerRate,
                platformCommission,
                platformCommissionRate: data.commissionRate,
                taxes,
                taxRate: data.taxRate,
                total,
                currency: 'NOK',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            });

            // Generate invoice
            const invoice = await paymentService.generateInvoice(booking.id);

            // Verify invoice contains all required financial details
            expect(invoice).toBeDefined();
            expect(invoice.bookingId).toBe(booking.id);
            expect(invoice.invoiceNumber).toMatch(/^INV-/);
            
            // Verify financial details match booking
            expect(invoice.subtotal).toBeCloseTo(data.providerRate, 2);
            expect(invoice.commission).toBeCloseTo(platformCommission, 2);
            expect(invoice.taxes).toBeCloseTo(taxes, 2);
            expect(invoice.total).toBeCloseTo(total, 2);
            
            // Verify company information is present
            expect(invoice.providerCompany.name).toBe(providerCompany.name);
            expect(invoice.providerCompany.organizationNumber).toBe(providerCompany.organizationNumber);
            expect(invoice.renterCompany.name).toBe(renterCompany.name);
            expect(invoice.renterCompany.organizationNumber).toBe(renterCompany.organizationNumber);
            
            // Verify PDF was generated
            expect(invoice.pdfPath).toBeDefined();
            expect(fs.existsSync(invoice.pdfPath)).toBe(true);
            
            // Verify line items exist
            expect(invoice.lineItems.length).toBeGreaterThan(0);
            
            // Verify dates
            expect(invoice.issueDate).toBeInstanceOf(Date);
            expect(invoice.dueDate).toBeInstanceOf(Date);
            expect(invoice.dueDate.getTime()).toBeGreaterThan(invoice.issueDate.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: vider-transport-marketplace, Property 24: Receipt generation on completion**
   * **Validates: Requirements 11.2**
   * 
   * Property: For any booking that transitions to Completed status, the system must generate 
   * a PDF receipt accessible from the user dashboard.
   */
  describe('Property 24: Receipt generation on completion', () => {
    it('should generate receipt for any completed booking', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random booking data
          fc.record({
            providerRate: fc.float({ min: 100, max: 10000, noNaN: true }),
            commissionRate: fc.float({ min: 1, max: 20, noNaN: true }),
            taxRate: fc.float({ min: 10, max: 30, noNaN: true }),
            durationHours: fc.integer({ min: 1, max: 48 }),
            driverName: fc.string({ minLength: 5, maxLength: 30 }),
            companyName1: fc.string({ minLength: 3, maxLength: 30 }),
            companyName2: fc.string({ minLength: 3, maxLength: 30 }),
          }),
          async (data) => {
            // Create test companies
            const providerCompany = await prisma.company.create({
              data: {
                name: data.companyName1,
                organizationNumber: `${Math.floor(Math.random() * 900000000) + 100000000}`,
                businessAddress: 'Test Address 1',
                city: 'Oslo',
                postalCode: '0001',
                fylke: 'Oslo',
                kommune: 'Oslo',
                vatRegistered: true,
              },
            });

            const renterCompany = await prisma.company.create({
              data: {
                name: data.companyName2,
                organizationNumber: `${Math.floor(Math.random() * 900000000) + 100000000}`,
                businessAddress: 'Test Address 2',
                city: 'Bergen',
                postalCode: '5001',
                fylke: 'Vestland',
                kommune: 'Bergen',
                vatRegistered: true,
              },
            });

            // Create driver listing
            const driverListing = await prisma.driverListing.create({
              data: {
                companyId: providerCompany.id,
                name: data.driverName,
                licenseClass: 'C',
                languages: ['Norwegian'],
                hourlyRate: data.providerRate / data.durationHours,
                currency: 'NOK',
                verified: true,
              },
            });

            // Calculate costs
            const platformCommission = data.providerRate * (data.commissionRate / 100);
            const subtotal = data.providerRate + platformCommission;
            const taxes = subtotal * (data.taxRate / 100);
            const total = subtotal + taxes;

            // Create booking in COMPLETED status
            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + data.durationHours);

            const booking = await prisma.booking.create({
              data: {
                bookingNumber: `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                renterCompanyId: renterCompany.id,
                providerCompanyId: providerCompany.id,
                driverListingId: driverListing.id,
                status: BookingStatus.COMPLETED,
                startDate,
                endDate,
                durationHours: data.durationHours,
                providerRate: data.providerRate,
                platformCommission,
                platformCommissionRate: data.commissionRate,
                taxes,
                taxRate: data.taxRate,
                total,
                currency: 'NOK',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                completedAt: new Date(),
              },
            });

            // Generate receipt
            const receipt = await paymentService.generateReceipt(booking.id);

            // Verify receipt is generated
            expect(receipt).toBeDefined();
            expect(receipt.bookingId).toBe(booking.id);
            expect(receipt.receiptNumber).toMatch(/^REC-/);
            
            // Verify financial details
            expect(receipt.subtotal).toBeCloseTo(data.providerRate, 2);
            expect(receipt.commission).toBeCloseTo(platformCommission, 2);
            expect(receipt.taxes).toBeCloseTo(taxes, 2);
            expect(receipt.total).toBeCloseTo(total, 2);
            
            // Verify company information
            expect(receipt.providerCompany.name).toBe(providerCompany.name);
            expect(receipt.providerCompany.organizationNumber).toBe(providerCompany.organizationNumber);
            expect(receipt.renterCompany.name).toBe(renterCompany.name);
            expect(receipt.renterCompany.organizationNumber).toBe(renterCompany.organizationNumber);
            
            // Verify PDF was generated and is accessible
            expect(receipt.pdfPath).toBeDefined();
            expect(fs.existsSync(receipt.pdfPath)).toBe(true);
            
            // Verify issue date
            expect(receipt.issueDate).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: vider-transport-marketplace, Property 28: Revenue calculation accuracy**
   * **Validates: Requirements 14.1**
   * 
   * Property: For any time period, the platform revenue must equal the sum of all commission 
   * amounts from bookings completed within that period.
   */
  describe('Property 28: Revenue calculation accuracy', () => {
    it('should calculate revenue as sum of commissions from completed bookings in time period', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random bookings data
          fc.array(
            fc.record({
              providerRate: fc.float({ min: 100, max: 5000, noNaN: true }),
              commissionRate: fc.float({ min: 1, max: 20, noNaN: true }),
              taxRate: fc.float({ min: 10, max: 30, noNaN: true }),
              daysAgo: fc.integer({ min: 0, max: 30 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (bookingsData) => {
            // Clean up before each iteration
            await prisma.booking.deleteMany({});
            await prisma.vehicleListing.deleteMany({});
            await prisma.company.deleteMany({});

            // Create test companies
            const providerCompany = await prisma.company.create({
              data: {
                name: 'Provider Company',
                organizationNumber: `${Math.floor(Math.random() * 900000000) + 100000000}`,
                businessAddress: 'Test Address 1',
                city: 'Oslo',
                postalCode: '0001',
                fylke: 'Oslo',
                kommune: 'Oslo',
                vatRegistered: true,
              },
            });

            const renterCompany = await prisma.company.create({
              data: {
                name: 'Renter Company',
                organizationNumber: `${Math.floor(Math.random() * 900000000) + 100000000}`,
                businessAddress: 'Test Address 2',
                city: 'Bergen',
                postalCode: '5001',
                fylke: 'Vestland',
                kommune: 'Bergen',
                vatRegistered: true,
              },
            });

            // Create vehicle listing
            const vehicleListing = await prisma.vehicleListing.create({
              data: {
                companyId: providerCompany.id,
                title: 'Test Vehicle',
                description: 'Test vehicle',
                vehicleType: 'PALLET_18',
                capacity: 18,
                fuelType: 'DIESEL',
                city: 'Oslo',
                fylke: 'Oslo',
                kommune: 'Oslo',
                dailyRate: 1000,
                currency: 'NOK',
                withDriver: false,
                withoutDriver: true,
                photos: [],
                tags: [],
              },
            });

            // Define the time period first
            const endDate = new Date(); // now
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 31); // 31 days ago

            // Track expected total commission and booking count
            let expectedTotalCommission = 0;
            let expectedBookingCount = 0;

            // Create bookings with different completion dates
            for (const bookingData of bookingsData) {
              const platformCommission = bookingData.providerRate * (bookingData.commissionRate / 100);
              const subtotal = bookingData.providerRate + platformCommission;
              const taxes = subtotal * (bookingData.taxRate / 100);
              const total = subtotal + taxes;

              const completedAt = new Date();
              completedAt.setDate(completedAt.getDate() - bookingData.daysAgo);

              await prisma.booking.create({
                data: {
                  bookingNumber: `BK-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
                  renterCompanyId: renterCompany.id,
                  providerCompanyId: providerCompany.id,
                  vehicleListingId: vehicleListing.id,
                  status: BookingStatus.COMPLETED,
                  startDate: new Date(completedAt.getTime() - 24 * 60 * 60 * 1000),
                  endDate: completedAt,
                  durationDays: 1,
                  providerRate: bookingData.providerRate,
                  platformCommission,
                  platformCommissionRate: bookingData.commissionRate,
                  taxes,
                  taxRate: bookingData.taxRate,
                  total,
                  currency: 'NOK',
                  expiresAt: completedAt,
                  completedAt,
                },
              });

              // Only count commission and booking if within the time period
              if (completedAt >= startDate && completedAt <= endDate) {
                expectedTotalCommission += platformCommission;
                expectedBookingCount++;
              }
            }

            const revenueReport = await paymentService.calculatePlatformRevenue(startDate, endDate);

            // Verify revenue equals sum of commissions
            expect(revenueReport.totalRevenue).toBeCloseTo(expectedTotalCommission, 2);
            expect(revenueReport.totalCommission).toBeCloseTo(expectedTotalCommission, 2);
            expect(revenueReport.totalTransactions).toBe(expectedBookingCount);
            expect(revenueReport.currency).toBe('NOK');
            expect(revenueReport.startDate).toEqual(startDate);
            expect(revenueReport.endDate).toEqual(endDate);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Unit tests for transaction management
  describe('Transaction Management', () => {
    it('should record a transaction for a booking', async () => {
      // Create test companies
      const providerCompany = await prisma.company.create({
        data: {
          name: 'Provider Company',
          organizationNumber: '123456789',
          businessAddress: 'Test Address 1',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      const renterCompany = await prisma.company.create({
        data: {
          name: 'Renter Company',
          organizationNumber: '987654321',
          businessAddress: 'Test Address 2',
          city: 'Bergen',
          postalCode: '5001',
          fylke: 'Vestland',
          kommune: 'Bergen',
          vatRegistered: true,
        },
      });

      // Create booking
      const booking = await prisma.booking.create({
        data: {
          bookingNumber: `BK-${Date.now()}`,
          renterCompanyId: renterCompany.id,
          providerCompanyId: providerCompany.id,
          status: BookingStatus.COMPLETED,
          startDate: new Date(),
          endDate: new Date(),
          durationDays: 1,
          providerRate: 1000,
          platformCommission: 50,
          platformCommissionRate: 5,
          taxes: 262.5,
          taxRate: 25,
          total: 1312.5,
          currency: 'NOK',
          expiresAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Record transaction
      const transaction = await paymentService.recordTransaction(
        booking.id,
        1312.5,
        TransactionType.BOOKING_PAYMENT,
        { note: 'Test payment' }
      );

      expect(transaction).toBeDefined();
      expect(transaction.bookingId).toBe(booking.id);
      expect(transaction.type).toBe(TransactionType.BOOKING_PAYMENT);
      expect(transaction.amount).toBe(1312.5);
      expect(transaction.currency).toBe('NOK');
      expect(transaction.status).toBe(TransactionStatus.PENDING);
    });

    it('should get all transactions for a company', async () => {
      // Create test companies
      const providerCompany = await prisma.company.create({
        data: {
          name: 'Provider Company',
          organizationNumber: '123456789',
          businessAddress: 'Test Address 1',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      const renterCompany = await prisma.company.create({
        data: {
          name: 'Renter Company',
          organizationNumber: '987654321',
          businessAddress: 'Test Address 2',
          city: 'Bergen',
          postalCode: '5001',
          fylke: 'Vestland',
          kommune: 'Bergen',
          vatRegistered: true,
        },
      });

      // Create bookings
      const booking1 = await prisma.booking.create({
        data: {
          bookingNumber: `BK-${Date.now()}-1`,
          renterCompanyId: renterCompany.id,
          providerCompanyId: providerCompany.id,
          status: BookingStatus.COMPLETED,
          startDate: new Date(),
          endDate: new Date(),
          durationDays: 1,
          providerRate: 1000,
          platformCommission: 50,
          platformCommissionRate: 5,
          taxes: 262.5,
          taxRate: 25,
          total: 1312.5,
          currency: 'NOK',
          expiresAt: new Date(),
          completedAt: new Date(),
        },
      });

      const booking2 = await prisma.booking.create({
        data: {
          bookingNumber: `BK-${Date.now()}-2`,
          renterCompanyId: renterCompany.id,
          providerCompanyId: providerCompany.id,
          status: BookingStatus.COMPLETED,
          startDate: new Date(),
          endDate: new Date(),
          durationDays: 1,
          providerRate: 2000,
          platformCommission: 100,
          platformCommissionRate: 5,
          taxes: 525,
          taxRate: 25,
          total: 2625,
          currency: 'NOK',
          expiresAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Record transactions
      await paymentService.recordTransaction(booking1.id, 1312.5, TransactionType.BOOKING_PAYMENT);
      await paymentService.recordTransaction(booking2.id, 2625, TransactionType.BOOKING_PAYMENT);

      // Get transactions for renter company
      const transactions = await paymentService.getCompanyTransactions(renterCompany.id);

      expect(transactions.length).toBe(2);
      expect(transactions[0].type).toBe(TransactionType.BOOKING_PAYMENT);
      expect(transactions[1].type).toBe(TransactionType.BOOKING_PAYMENT);
    });
  });
});
