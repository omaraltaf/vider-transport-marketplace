/**
 * Analytics Scheduler Service
 * Handles scheduled metric calculations and cache warming
 */

import cron from 'node-cron';
import { analyticsService } from './analytics.service';
import { logger } from '../config/logger';

export class AnalyticsSchedulerService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Start all scheduled analytics jobs
   */
  start(): void {
    this.scheduleMetricCalculations();
    this.scheduleCacheWarming();
    this.scheduleDataAggregation();
    
    logger.info('Analytics scheduler started with all jobs');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped analytics job: ${name}`);
    });
    this.jobs.clear();
  }

  /**
   * Schedule regular metric calculations
   */
  private scheduleMetricCalculations(): void {
    // Refresh KPIs every 5 minutes
    const kpiJob = cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info('Starting scheduled KPI calculation');
        await analyticsService.getPlatformKPIs(false);
        logger.info('Completed scheduled KPI calculation');
      } catch (error) {
        logger.error('Error in scheduled KPI calculation:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('kpi-calculation', kpiJob);
    kpiJob.start();

    // Refresh geographic metrics every 30 minutes
    const geoJob = cron.schedule('*/30 * * * *', async () => {
      try {
        logger.info('Starting scheduled geographic metrics calculation');
        await analyticsService.getGeographicMetrics(false);
        logger.info('Completed scheduled geographic metrics calculation');
      } catch (error) {
        logger.error('Error in scheduled geographic metrics calculation:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('geographic-metrics', geoJob);
    geoJob.start();
  }

  /**
   * Schedule cache warming for frequently accessed data
   */
  private scheduleCacheWarming(): void {
    // Warm time series caches every hour
    const cacheWarmJob = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Starting cache warming');
        
        const now = new Date();
        const timeRanges = [
          {
            start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days
            end: now,
            granularity: 'day' as const
          },
          {
            start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days
            end: now,
            granularity: 'day' as const
          },
          {
            start: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24 hours
            end: now,
            granularity: 'hour' as const
          }
        ];

        const metrics = ['users', 'bookings', 'revenue'];
        
        for (const metric of metrics) {
          for (const timeRange of timeRanges) {
            await analyticsService.getTimeSeriesData(metric, timeRange, false);
          }
        }
        
        logger.info('Completed cache warming');
      } catch (error) {
        logger.error('Error in cache warming:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('cache-warming', cacheWarmJob);
    cacheWarmJob.start();
  }

  /**
   * Schedule daily data aggregation jobs
   */
  private scheduleDataAggregation(): void {
    // Daily aggregation at 2 AM
    const dailyAggregationJob = cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Starting daily data aggregation');
        await this.performDailyAggregation();
        logger.info('Completed daily data aggregation');
      } catch (error) {
        logger.error('Error in daily data aggregation:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('daily-aggregation', dailyAggregationJob);
    dailyAggregationJob.start();

    // Weekly aggregation on Sundays at 3 AM
    const weeklyAggregationJob = cron.schedule('0 3 * * 0', async () => {
      try {
        logger.info('Starting weekly data aggregation');
        await this.performWeeklyAggregation();
        logger.info('Completed weekly data aggregation');
      } catch (error) {
        logger.error('Error in weekly data aggregation:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('weekly-aggregation', weeklyAggregationJob);
    weeklyAggregationJob.start();

    // Monthly aggregation on the 1st at 4 AM
    const monthlyAggregationJob = cron.schedule('0 4 1 * *', async () => {
      try {
        logger.info('Starting monthly data aggregation');
        await this.performMonthlyAggregation();
        logger.info('Completed monthly data aggregation');
      } catch (error) {
        logger.error('Error in monthly data aggregation:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('monthly-aggregation', monthlyAggregationJob);
    monthlyAggregationJob.start();
  }

  /**
   * Perform daily data aggregation
   */
  private async performDailyAggregation(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    // Pre-calculate and cache yesterday's metrics
    const timeRange = {
      start: yesterday,
      end: today,
      granularity: 'day' as const
    };

    const metrics = ['users', 'bookings', 'revenue'];
    
    for (const metric of metrics) {
      await analyticsService.getTimeSeriesData(metric, timeRange, false);
    }

    // Refresh all cached metrics to ensure consistency
    await analyticsService.refreshAllMetrics();
  }

  /**
   * Perform weekly data aggregation
   */
  private async performWeeklyAggregation(): Promise<void> {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    lastWeek.setHours(0, 0, 0, 0);

    const thisWeek = new Date(lastWeek);
    thisWeek.setDate(thisWeek.getDate() + 7);

    const timeRange = {
      start: lastWeek,
      end: thisWeek,
      granularity: 'week' as const
    };

    const metrics = ['users', 'bookings', 'revenue'];
    
    for (const metric of metrics) {
      await analyticsService.getTimeSeriesData(metric, timeRange, false);
    }

    // Clean up old cache entries
    await this.cleanupOldCacheEntries();
  }

  /**
   * Perform monthly data aggregation
   */
  private async performMonthlyAggregation(): Promise<void> {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);
    lastMonth.setHours(0, 0, 0, 0);

    const thisMonth = new Date(lastMonth);
    thisMonth.setMonth(thisMonth.getMonth() + 1);

    const timeRange = {
      start: lastMonth,
      end: thisMonth,
      granularity: 'month' as const
    };

    const metrics = ['users', 'bookings', 'revenue'];
    
    for (const metric of metrics) {
      await analyticsService.getTimeSeriesData(metric, timeRange, false);
    }

    // Generate monthly reports
    await this.generateMonthlyReports(lastMonth);
  }

  /**
   * Clean up old cache entries
   */
  private async cleanupOldCacheEntries(): Promise<void> {
    // Remove cache entries older than 30 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    // This would require implementing a more sophisticated cache cleanup
    // For now, we'll just refresh all metrics
    await analyticsService.refreshAllMetrics();
  }

  /**
   * Generate monthly reports
   */
  private async generateMonthlyReports(month: Date): Promise<void> {
    logger.info(`Generating monthly reports for ${month.toISOString().slice(0, 7)}`);
    
    // Get monthly KPIs
    const kpis = await analyticsService.getPlatformKPIs(false);
    
    // Get geographic metrics
    const geoMetrics = await analyticsService.getGeographicMetrics(false);
    
    // Store monthly summary (this could be saved to database or sent via email)
    const monthlySummary = {
      month: month.toISOString().slice(0, 7),
      kpis,
      topRegions: geoMetrics.slice(0, 10),
      generatedAt: new Date()
    };
    
    logger.info('Monthly summary generated:', {
      month: monthlySummary.month,
      totalUsers: kpis.totalUsers,
      totalRevenue: kpis.totalRevenue,
      topRegion: geoMetrics[0]?.region
    });
  }

  /**
   * Get job status
   */
  getJobStatus(): Record<string, { running: boolean; nextRun?: Date }> {
    const status: Record<string, { running: boolean; nextRun?: Date }> = {};
    
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running,
        nextRun: job.nextDate()?.toDate()
      };
    });
    
    return status;
  }

  /**
   * Manually trigger a specific job
   */
  async triggerJob(jobName: string): Promise<void> {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job not found: ${jobName}`);
    }

    logger.info(`Manually triggering job: ${jobName}`);
    
    switch (jobName) {
      case 'kpi-calculation':
        await analyticsService.getPlatformKPIs(false);
        break;
      case 'geographic-metrics':
        await analyticsService.getGeographicMetrics(false);
        break;
      case 'cache-warming':
        await analyticsService.refreshAllMetrics();
        break;
      case 'daily-aggregation':
        await this.performDailyAggregation();
        break;
      case 'weekly-aggregation':
        await this.performWeeklyAggregation();
        break;
      case 'monthly-aggregation':
        await this.performMonthlyAggregation();
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
    
    logger.info(`Completed manual job trigger: ${jobName}`);
  }
}

export const analyticsScheduler = new AnalyticsSchedulerService();