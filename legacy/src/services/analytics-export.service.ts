/**
 * Analytics Export Service
 * Handles data export functionality for analytics reports
 */

import { Parser } from 'json2csv';
import * as ExcelJS from 'exceljs';
import nodemailer from 'nodemailer';
import * as cron from 'node-cron';
import { analyticsService } from './analytics.service';
import { growthAnalyticsService } from './growth-analytics.service';
import { geographicAnalyticsService } from './geographic-analytics.service';
import { logger } from '../config/logger';
import { PrismaClient } from '@prisma/client';
import { getDatabaseClient } from '../config/database';

const prisma = getDatabaseClient();

export interface ExportRequest {
  reportType: 'kpis' | 'growth' | 'geographic' | 'cohorts' | 'comprehensive';
  format: 'csv' | 'excel' | 'json';
  dateRange: {
    start: Date;
    end: Date;
  };
  filters?: {
    regions?: string[];
    metrics?: string[];
    granularity?: 'hour' | 'day' | 'week' | 'month';
  };
  delivery?: {
    method: 'download' | 'email';
    recipients?: string[];
    schedule?: string; // cron expression for scheduled reports
  };
}

export interface ScheduledReport {
  id: string;
  name: string;
  reportType: string;
  format: string;
  schedule: string;
  recipients: string[];
  filters: any;
  isActive: boolean;
  createdBy: string;
  lastRun?: Date;
  nextRun?: Date;
}

export class AnalyticsExportService {
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    this.setupEmailTransporter();
  }

  /**
   * Setup email transporter for report delivery
   */
  private setupEmailTransporter(): void {
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Export analytics data based on request
   */
  async exportData(request: ExportRequest): Promise<{
    data: Buffer | string;
    filename: string;
    contentType: string;
  }> {
    try {
      logger.info('Starting analytics export', { 
        reportType: request.reportType,
        format: request.format,
        dateRange: request.dateRange 
      });

      // Collect data based on report type
      const reportData = await this.collectReportData(request);

      // Generate export based on format
      const exportResult = await this.generateExport(reportData, request);

      logger.info('Analytics export completed', { 
        reportType: request.reportType,
        format: request.format,
        filename: exportResult.filename 
      });

      return exportResult;
    } catch (error) {
      logger.error('Error exporting analytics data:', error);
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  /**
   * Collect report data based on request type
   */
  private async collectReportData(request: ExportRequest): Promise<any> {
    const { reportType, dateRange, filters } = request;

    switch (reportType) {
      case 'kpis':
        return await this.collectKPIData();

      case 'growth':
        return await this.collectGrowthData(dateRange);

      case 'geographic':
        return await this.collectGeographicData(filters?.regions);

      case 'cohorts':
        return await this.collectCohortData(dateRange);

      case 'comprehensive':
        return await this.collectComprehensiveData(dateRange, filters);

      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  /**
   * Collect KPI data
   */
  private async collectKPIData(): Promise<any> {
    const kpis = await analyticsService.getPlatformKPIs(false);
    
    return {
      reportType: 'Platform KPIs',
      generatedAt: new Date().toISOString(),
      data: {
        summary: kpis,
        breakdown: {
          userMetrics: {
            totalUsers: kpis.totalUsers,
            activeUsers: kpis.activeUsers,
            userGrowthRate: kpis.userGrowthRate,
            platformUtilization: kpis.platformUtilization
          },
          businessMetrics: {
            totalCompanies: kpis.totalCompanies,
            activeCompanies: kpis.activeCompanies,
            totalBookings: kpis.totalBookings,
            completedBookings: kpis.completedBookings
          },
          financialMetrics: {
            totalRevenue: kpis.totalRevenue,
            averageBookingValue: kpis.averageBookingValue,
            revenueGrowthRate: kpis.revenueGrowthRate
          }
        }
      }
    };
  }

  /**
   * Collect growth data
   */
  private async collectGrowthData(dateRange: { start: Date; end: Date }): Promise<any> {
    const growthMetrics = await growthAnalyticsService.getGrowthMetrics(
      dateRange.start,
      dateRange.end,
      false
    );

    return {
      reportType: 'Growth Analytics',
      dateRange,
      generatedAt: new Date().toISOString(),
      data: {
        userGrowth: growthMetrics.userGrowth,
        bookingGrowth: growthMetrics.bookingGrowth,
        revenueGrowth: growthMetrics.revenueGrowth,
        trendAnalysis: growthMetrics.trendAnalysis,
        forecasting: growthMetrics.forecasting
      }
    };
  }

  /**
   * Collect geographic data
   */
  private async collectGeographicData(regionFilter?: string[]): Promise<any> {
    const geographicData = await geographicAnalyticsService.getGeographicUsageData(false);

    let filteredRegions = geographicData.regions;
    if (regionFilter && regionFilter.length > 0) {
      filteredRegions = geographicData.regions.filter(region => 
        regionFilter.includes(region.region)
      );
    }

    return {
      reportType: 'Geographic Analytics',
      generatedAt: new Date().toISOString(),
      filters: { regions: regionFilter },
      data: {
        regions: filteredRegions,
        performanceComparison: geographicData.performanceComparison,
        expansionOpportunities: geographicData.expansionOpportunities,
        marketPenetration: geographicData.marketPenetration
      }
    };
  }

  /**
   * Collect cohort data
   */
  private async collectCohortData(dateRange: { start: Date; end: Date }): Promise<any> {
    const growthMetrics = await growthAnalyticsService.getGrowthMetrics(
      dateRange.start,
      dateRange.end,
      false
    );

    return {
      reportType: 'Cohort Analysis',
      dateRange,
      generatedAt: new Date().toISOString(),
      data: {
        cohorts: growthMetrics.cohortAnalysis,
        summary: {
          totalCohorts: growthMetrics.cohortAnalysis.length,
          averageLifetimeValue: growthMetrics.cohortAnalysis.reduce((sum, c) => sum + c.lifetimeValue, 0) / growthMetrics.cohortAnalysis.length,
          averageRetentionRate: this.calculateAverageRetention(growthMetrics.cohortAnalysis)
        }
      }
    };
  }

  /**
   * Collect comprehensive data
   */
  private async collectComprehensiveData(
    dateRange: { start: Date; end: Date },
    filters?: any
  ): Promise<any> {
    const [kpis, growthMetrics, geographicData] = await Promise.all([
      this.collectKPIData(),
      this.collectGrowthData(dateRange),
      this.collectGeographicData(filters?.regions)
    ]);

    return {
      reportType: 'Comprehensive Analytics Report',
      dateRange,
      generatedAt: new Date().toISOString(),
      filters,
      data: {
        kpis: kpis.data,
        growth: growthMetrics.data,
        geographic: geographicData.data,
        executiveSummary: {
          totalUsers: kpis.data.summary.totalUsers,
          userGrowthRate: growthMetrics.data.userGrowth.growthRate,
          totalRevenue: kpis.data.summary.totalRevenue,
          revenueGrowthRate: growthMetrics.data.revenueGrowth.growthRate,
          topRegion: geographicData.data.regions[0]?.region,
          marketPenetration: geographicData.data.marketPenetration.nationalPenetration
        }
      }
    };
  }

  /**
   * Generate export in specified format
   */
  private async generateExport(
    data: any,
    request: ExportRequest
  ): Promise<{ data: Buffer | string; filename: string; contentType: string }> {
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = `${request.reportType}_report_${timestamp}`;

    switch (request.format) {
      case 'csv':
        return await this.generateCSVExport(data, baseFilename);
      case 'excel':
        return await this.generateExcelExport(data, baseFilename);
      case 'json':
        return this.generateJSONExport(data, baseFilename);
      default:
        throw new Error(`Unsupported export format: ${request.format}`);
    }
  }

  /**
   * Generate CSV export
   */
  private async generateCSVExport(
    data: any,
    baseFilename: string
  ): Promise<{ data: string; filename: string; contentType: string }> {
    // Flatten data for CSV format
    const flattenedData = this.flattenDataForCSV(data);
    
    const parser = new Parser();
    const csv = parser.parse(flattenedData);

    return {
      data: csv,
      filename: `${baseFilename}.csv`,
      contentType: 'text/csv'
    };
  }

  /**
   * Generate Excel export
   */
  private async generateExcelExport(
    data: any,
    baseFilename: string
  ): Promise<{ data: Buffer; filename: string; contentType: string }> {
    const workbook = new ExcelJS.Workbook();
    
    // Add metadata
    workbook.creator = 'Vider Platform Admin';
    workbook.created = new Date();
    
    // Create summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    this.addSummaryToSheet(summarySheet, data);

    // Add detailed data sheets based on report type
    if (data.data.kpis) {
      const kpiSheet = workbook.addWorksheet('KPIs');
      this.addKPIsToSheet(kpiSheet, data.data.kpis);
    }

    if (data.data.growth) {
      const growthSheet = workbook.addWorksheet('Growth Analysis');
      this.addGrowthToSheet(growthSheet, data.data.growth);
    }

    if (data.data.geographic) {
      const geoSheet = workbook.addWorksheet('Geographic Analysis');
      this.addGeographicToSheet(geoSheet, data.data.geographic);
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      data: buffer as unknown as Buffer,
      filename: `${baseFilename}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  /**
   * Generate JSON export
   */
  private generateJSONExport(
    data: any,
    baseFilename: string
  ): { data: string; filename: string; contentType: string } {
    return {
      data: JSON.stringify(data, null, 2),
      filename: `${baseFilename}.json`,
      contentType: 'application/json'
    };
  }

  /**
   * Create scheduled report
   */
  async createScheduledReport(
    reportConfig: Omit<ScheduledReport, 'id' | 'lastRun' | 'nextRun'>,
    createdBy: string
  ): Promise<ScheduledReport> {
    try {
      // Validate cron expression
      if (!cron.validate(reportConfig.schedule)) {
        throw new Error('Invalid cron schedule expression');
      }

      // Create report record
      const report = await prisma.scheduledReport.create({
        data: {
          name: reportConfig.name,
          reportType: reportConfig.reportType,
          format: reportConfig.format,
          schedule: reportConfig.schedule,
          recipients: reportConfig.recipients,
          filters: reportConfig.filters,
          isActive: reportConfig.isActive,
          createdBy
        }
      });

      // Schedule the job if active
      if (reportConfig.isActive) {
        this.scheduleReport(report);
      }

      logger.info('Scheduled report created', { 
        reportId: report.id,
        name: reportConfig.name,
        schedule: reportConfig.schedule 
      });

      return {
        id: report.id,
        name: report.name,
        reportType: report.reportType,
        format: report.format,
        schedule: report.schedule,
        recipients: report.recipients as string[],
        filters: report.filters,
        isActive: report.isActive,
        createdBy: report.createdBy,
        lastRun: report.lastRun,
        nextRun: this.getNextRunTime(report.schedule)
      };
    } catch (error) {
      logger.error('Error creating scheduled report:', error);
      throw error;
    }
  }

  /**
   * Schedule a report job
   */
  private scheduleReport(report: any): void {
    const job = cron.schedule(report.schedule, async () => {
      await this.executeScheduledReport(report.id);
    });

    this.scheduledJobs.set(report.id, job);
    job.start();

    logger.info('Report job scheduled', { 
      reportId: report.id,
      schedule: report.schedule 
    });
  }

  /**
   * Execute scheduled report
   */
  private async executeScheduledReport(reportId: string): Promise<void> {
    try {
      logger.info('Executing scheduled report', { reportId });

      // Get report configuration
      const report = await prisma.scheduledReport.findUnique({
        where: { id: reportId }
      });

      if (!report || !report.isActive) {
        logger.warn('Scheduled report not found or inactive', { reportId });
        return;
      }

      // Generate export request
      const exportRequest: ExportRequest = {
        reportType: report.reportType as any,
        format: report.format as any,
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          end: new Date()
        },
        filters: report.filters as any,
        delivery: {
          method: 'email',
          recipients: report.recipients as string[]
        }
      };

      // Generate and send report
      const exportResult = await this.exportData(exportRequest);
      await this.sendReportByEmail(
        exportResult,
        report.recipients as string[],
        report.name
      );

      // Update last run time
      await prisma.scheduledReport.update({
        where: { id: reportId },
        data: { lastRun: new Date() }
      });

      logger.info('Scheduled report executed successfully', { reportId });
    } catch (error) {
      logger.error('Error executing scheduled report:', error);
    }
  }

  /**
   * Send report by email
   */
  async sendReportByEmail(
    exportResult: { data: Buffer | string; filename: string; contentType: string },
    recipients: string[],
    reportName: string
  ): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@vider.no',
        to: recipients.join(', '),
        subject: `Vider Analytics Report: ${reportName}`,
        html: `
          <h2>Vider Platform Analytics Report</h2>
          <p>Please find your requested analytics report attached.</p>
          <p><strong>Report:</strong> ${reportName}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p>This is an automated report from the Vider Platform Admin Dashboard.</p>
        `,
        attachments: [
          {
            filename: exportResult.filename,
            content: exportResult.data,
            contentType: exportResult.contentType
          }
        ]
      };

      await this.emailTransporter.sendMail(mailOptions);
      
      logger.info('Report sent by email', { 
        recipients,
        filename: exportResult.filename 
      });
    } catch (error) {
      logger.error('Error sending report by email:', error);
      throw error;
    }
  }

  /**
   * Helper methods for data processing
   */
  private flattenDataForCSV(data: any): any[] {
    // Implement data flattening logic for CSV export
    const flattened: any[] = [];
    
    if (data.data.summary) {
      flattened.push({
        metric: 'Total Users',
        value: data.data.summary.totalUsers,
        category: 'Users'
      });
      flattened.push({
        metric: 'Active Users',
        value: data.data.summary.activeUsers,
        category: 'Users'
      });
      // Add more metrics as needed
    }

    return flattened;
  }

  private addSummaryToSheet(sheet: ExcelJS.Worksheet, data: any): void {
    sheet.addRow(['Report Type', data.reportType]);
    sheet.addRow(['Generated At', data.generatedAt]);
    sheet.addRow(['']);
    
    if (data.data.executiveSummary) {
      sheet.addRow(['Executive Summary']);
      Object.entries(data.data.executiveSummary).forEach(([key, value]) => {
        sheet.addRow([key, value]);
      });
    }
  }

  private addKPIsToSheet(sheet: ExcelJS.Worksheet, kpiData: any): void {
    sheet.addRow(['Metric', 'Value', 'Category']);
    
    if (kpiData.summary) {
      Object.entries(kpiData.summary).forEach(([key, value]) => {
        sheet.addRow([key, value, 'KPI']);
      });
    }
  }

  private addGrowthToSheet(sheet: ExcelJS.Worksheet, growthData: any): void {
    sheet.addRow(['Metric', 'Current Period', 'Previous Period', 'Growth Rate']);
    
    if (growthData.userGrowth) {
      sheet.addRow([
        'User Growth',
        growthData.userGrowth.currentPeriod,
        growthData.userGrowth.previousPeriod,
        `${growthData.userGrowth.growthRate}%`
      ]);
    }
  }

  private addGeographicToSheet(sheet: ExcelJS.Worksheet, geoData: any): void {
    sheet.addRow(['Region', 'Users', 'Bookings', 'Revenue', 'Growth Rate']);
    
    if (geoData.regions) {
      geoData.regions.forEach((region: any) => {
        sheet.addRow([
          region.region,
          region.userCount,
          region.bookingCount,
          region.totalRevenue,
          `${region.userGrowthRate}%`
        ]);
      });
    }
  }

  private calculateAverageRetention(cohorts: any[]): number {
    if (cohorts.length === 0) return 0;
    
    const totalRetention = cohorts.reduce((sum, cohort) => {
      const avgRetention = cohort.retentionRates.reduce((rSum: number, r: any) => rSum + r.retentionRate, 0) / cohort.retentionRates.length;
      return sum + avgRetention;
    }, 0);
    
    return totalRetention / cohorts.length;
  }

  private getNextRunTime(schedule: string): Date {
    // Simple next run calculation (in production, use a proper cron parser)
    const now = new Date();
    return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next day for simplicity
  }
}

export const analyticsExportService = new AnalyticsExportService();