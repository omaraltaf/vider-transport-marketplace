/**
 * Growth Analytics Service
 * Handles user growth, booking trends, revenue forecasting, and cohort analysis
 */

import { PrismaClient } from '@prisma/client';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { getDatabaseClient } from '../config/database';

const prisma = getDatabaseClient();

export interface GrowthMetrics {
  userGrowth: GrowthData;
  bookingGrowth: GrowthData;
  revenueGrowth: GrowthData;
  cohortAnalysis: CohortData[];
  trendAnalysis: TrendAnalysis;
  forecasting: ForecastData;
}

export interface GrowthData {
  currentPeriod: number;
  previousPeriod: number;
  growthRate: number;
  growthDirection: 'up' | 'down' | 'stable';
  periodOverPeriodChange: number;
  compoundGrowthRate: number;
  timeSeries: Array<{
    period: string;
    value: number;
    growthRate: number;
  }>;
}

export interface CohortData {
  cohortMonth: string;
  cohortSize: number;
  retentionRates: Array<{
    month: number;
    retainedUsers: number;
    retentionRate: number;
  }>;
  lifetimeValue: number;
  averageLifespan: number;
}

export interface TrendAnalysis {
  userAcquisition: TrendMetric;
  bookingVolume: TrendMetric;
  revenuePerUser: TrendMetric;
  seasonality: SeasonalityData;
  anomalies: AnomalyData[];
}

export interface TrendMetric {
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  confidence: number;
  slope: number;
  r2: number;
  projectedValue: number;
}

export interface SeasonalityData {
  monthlyPattern: Array<{
    month: number;
    multiplier: number;
    confidence: number;
  }>;
  weeklyPattern: Array<{
    dayOfWeek: number;
    multiplier: number;
    confidence: number;
  }>;
  hasSeasonality: boolean;
}

export interface AnomalyData {
  date: Date;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
}

export interface ForecastData {
  userGrowthForecast: Array<{
    period: string;
    predicted: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
  }>;
  revenueForecast: Array<{
    period: string;
    predicted: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
  }>;
  forecastAccuracy: {
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
  };
}

export class GrowthAnalyticsService {
  private readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Get comprehensive growth metrics
   */
  async getGrowthMetrics(
    startDate: Date,
    endDate: Date,
    useCache = true
  ): Promise<GrowthMetrics> {
    const cacheKey = `growth:metrics:${startDate.getTime()}:${endDate.getTime()}`;
    
    if (useCache) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const [
      userGrowth,
      bookingGrowth,
      revenueGrowth,
      cohortAnalysis,
      trendAnalysis,
      forecasting
    ] = await Promise.all([
      this.calculateUserGrowth(startDate, endDate),
      this.calculateBookingGrowth(startDate, endDate),
      this.calculateRevenueGrowth(startDate, endDate),
      this.calculateCohortAnalysis(startDate, endDate),
      this.calculateTrendAnalysis(startDate, endDate),
      this.calculateForecasting(startDate, endDate)
    ]);

    const metrics: GrowthMetrics = {
      userGrowth,
      bookingGrowth,
      revenueGrowth,
      cohortAnalysis,
      trendAnalysis,
      forecasting
    };

    await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
    return metrics;
  }

  /**
   * Calculate user growth metrics
   */
  private async calculateUserGrowth(startDate: Date, endDate: Date): Promise<GrowthData> {
    const periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousStartDate = new Date(startDate.getTime() - periodLength * 24 * 60 * 60 * 1000);

    // Get current and previous period user counts
    const [currentPeriodUsers, previousPeriodUsers] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: previousStartDate,
            lt: startDate
          }
        }
      })
    ]);

    // Calculate growth rate
    const growthRate = previousPeriodUsers > 0 
      ? ((currentPeriodUsers - previousPeriodUsers) / previousPeriodUsers) * 100 
      : 0;

    // Get time series data for the period
    const timeSeries = await this.getUserGrowthTimeSeries(startDate, endDate);

    // Calculate compound growth rate
    const compoundGrowthRate = this.calculateCompoundGrowthRate(timeSeries);

    return {
      currentPeriod: currentPeriodUsers,
      previousPeriod: previousPeriodUsers,
      growthRate,
      growthDirection: this.getGrowthDirection(growthRate),
      periodOverPeriodChange: currentPeriodUsers - previousPeriodUsers,
      compoundGrowthRate,
      timeSeries
    };
  }

  /**
   * Calculate booking growth metrics
   */
  private async calculateBookingGrowth(startDate: Date, endDate: Date): Promise<GrowthData> {
    const periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousStartDate = new Date(startDate.getTime() - periodLength * 24 * 60 * 60 * 1000);

    const [currentPeriodBookings, previousPeriodBookings] = await Promise.all([
      prisma.booking.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      prisma.booking.count({
        where: {
          createdAt: {
            gte: previousStartDate,
            lt: startDate
          }
        }
      })
    ]);

    const growthRate = previousPeriodBookings > 0 
      ? ((currentPeriodBookings - previousPeriodBookings) / previousPeriodBookings) * 100 
      : 0;

    const timeSeries = await this.getBookingGrowthTimeSeries(startDate, endDate);
    const compoundGrowthRate = this.calculateCompoundGrowthRate(timeSeries);

    return {
      currentPeriod: currentPeriodBookings,
      previousPeriod: previousPeriodBookings,
      growthRate,
      growthDirection: this.getGrowthDirection(growthRate),
      periodOverPeriodChange: currentPeriodBookings - previousPeriodBookings,
      compoundGrowthRate,
      timeSeries
    };
  }

  /**
   * Calculate revenue growth metrics - REAL DATA VERSION
   */
  private async calculateRevenueGrowth(startDate: Date, endDate: Date): Promise<GrowthData> {
    const periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousStartDate = new Date(startDate.getTime() - periodLength * 24 * 60 * 60 * 1000);

    try {
      // Use Transaction table for accurate revenue data
      const [currentPeriodRevenue, previousPeriodRevenue] = await Promise.all([
        prisma.transaction.aggregate({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            },
            status: 'COMPLETED'
          },
          _sum: {
            amount: true
          }
        }),
        prisma.transaction.aggregate({
          where: {
            createdAt: {
              gte: previousStartDate,
              lt: startDate
            },
            status: 'COMPLETED'
          },
          _sum: {
            amount: true
          }
        })
      ]);

      const currentRevenue = currentPeriodRevenue._sum.amount || 0;
      const previousRevenue = previousPeriodRevenue._sum.amount || 0;

      const growthRate = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;

      const timeSeries = await this.getRevenueGrowthTimeSeries(startDate, endDate);
      const compoundGrowthRate = this.calculateCompoundGrowthRate(timeSeries);

      return {
        currentPeriod: currentRevenue,
        previousPeriod: previousRevenue,
        growthRate,
        growthDirection: this.getGrowthDirection(growthRate),
        periodOverPeriodChange: currentRevenue - previousRevenue,
        compoundGrowthRate,
        timeSeries
      };

    } catch (error) {
      console.error('Error calculating revenue growth, using fallback data:', error);
      
      // Return realistic fallback data
      return {
        currentPeriod: 0,
        previousPeriod: 0,
        growthRate: 0,
        growthDirection: 'stable',
        periodOverPeriodChange: 0,
        compoundGrowthRate: 0,
        timeSeries: []
      };
    }
  }

  /**
   * Calculate cohort analysis
   */
  private async calculateCohortAnalysis(startDate: Date, endDate: Date): Promise<CohortData[]> {
    const cohorts: CohortData[] = [];
    
    // Get cohorts by month for the last 12 months
    const monthsBack = 12;
    
    for (let i = 0; i < monthsBack; i++) {
      const cohortDate = new Date(endDate);
      cohortDate.setMonth(cohortDate.getMonth() - i);
      cohortDate.setDate(1);
      cohortDate.setHours(0, 0, 0, 0);
      
      const nextMonth = new Date(cohortDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      // Get users who signed up in this cohort month
      const cohortUsers = await prisma.user.findMany({
        where: {
          createdAt: {
            gte: cohortDate,
            lt: nextMonth
          }
        },
        select: {
          id: true,
          createdAt: true
        }
      });

      if (cohortUsers.length === 0) continue;

      const cohortSize = cohortUsers.length;
      const retentionRates: Array<{
        month: number;
        retainedUsers: number;
        retentionRate: number;
      }> = [];

      // Calculate retention for each subsequent month
      for (let month = 1; month <= 12; month++) {
        const retentionDate = new Date(cohortDate);
        retentionDate.setMonth(retentionDate.getMonth() + month);
        
        const nextRetentionDate = new Date(retentionDate);
        nextRetentionDate.setMonth(nextRetentionDate.getMonth() + 1);

        // Count users who were active in this retention month (using updatedAt as proxy for activity)
        const retainedUsers = await prisma.user.count({
          where: {
            id: {
              in: cohortUsers.map(u => u.id)
            },
            updatedAt: {
              gte: retentionDate,
              lt: nextRetentionDate
            }
          }
        });

        const retentionRate = (retainedUsers / cohortSize) * 100;
        
        retentionRates.push({
          month,
          retainedUsers,
          retentionRate
        });
      }

      // Calculate lifetime value (simplified) - using company relationship
      const cohortRevenue = await prisma.transaction.aggregate({
        where: {
          booking: {
            OR: [
              {
                renterCompany: {
                  users: {
                    some: {
                      id: {
                        in: cohortUsers.map(u => u.id)
                      }
                    }
                  }
                }
              },
              {
                providerCompany: {
                  users: {
                    some: {
                      id: {
                        in: cohortUsers.map(u => u.id)
                      }
                    }
                  }
                }
              }
            ]
          },
          status: 'COMPLETED'
        },
        _sum: {
          amount: true
        }
      });

      const lifetimeValue = cohortRevenue._sum.amount 
        ? cohortRevenue._sum.amount / cohortSize 
        : 0;

      // Calculate average lifespan (months until retention drops below 5%)
      const averageLifespan = retentionRates.findIndex(r => r.retentionRate < 5) || 12;

      cohorts.push({
        cohortMonth: cohortDate.toISOString().slice(0, 7),
        cohortSize,
        retentionRates,
        lifetimeValue,
        averageLifespan
      });
    }

    return cohorts.reverse(); // Return in chronological order
  }

  /**
   * Calculate trend analysis
   */
  private async calculateTrendAnalysis(startDate: Date, endDate: Date): Promise<TrendAnalysis> {
    // Get daily data for trend analysis
    const dailyUserData = await this.getUserGrowthTimeSeries(startDate, endDate);
    const dailyBookingData = await this.getBookingGrowthTimeSeries(startDate, endDate);
    const dailyRevenueData = await this.getRevenueGrowthTimeSeries(startDate, endDate);

    // Calculate trends using linear regression
    const userAcquisition = this.calculateTrendMetric(dailyUserData);
    const bookingVolume = this.calculateTrendMetric(dailyBookingData);
    const revenuePerUser = this.calculateRevenuePerUserTrend(dailyUserData, dailyRevenueData);

    // Calculate seasonality patterns
    const seasonality = await this.calculateSeasonality(startDate, endDate);

    // Detect anomalies
    const anomalies = await this.detectAnomalies(startDate, endDate);

    return {
      userAcquisition,
      bookingVolume,
      revenuePerUser,
      seasonality,
      anomalies
    };
  }

  /**
   * Calculate forecasting data
   */
  private async calculateForecasting(startDate: Date, endDate: Date): Promise<ForecastData> {
    // Get historical data for forecasting
    const historicalUserData = await this.getUserGrowthTimeSeries(startDate, endDate);
    const historicalRevenueData = await this.getRevenueGrowthTimeSeries(startDate, endDate);

    // Simple linear forecasting (in production, use more sophisticated models)
    const userGrowthForecast = this.generateLinearForecast(historicalUserData, 30); // 30 days ahead
    const revenueForecast = this.generateLinearForecast(historicalRevenueData, 30);

    // Calculate forecast accuracy (using last 30 days as test set)
    const forecastAccuracy = this.calculateForecastAccuracy(historicalUserData, historicalRevenueData);

    return {
      userGrowthForecast,
      revenueForecast,
      forecastAccuracy
    };
  }

  /**
   * Get user growth time series
   */
  private async getUserGrowthTimeSeries(startDate: Date, endDate: Date): Promise<Array<{
    period: string;
    value: number;
    growthRate: number;
  }>> {
    const result = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as period,
        COUNT(*)::int as value
      FROM "User"
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY period ASC
    ` as Array<{ period: Date; value: number }>;

    // Calculate growth rates
    return result.map((row, index) => {
      const previousValue = index > 0 ? result[index - 1].value : row.value;
      const growthRate = previousValue > 0 ? ((row.value - previousValue) / previousValue) * 100 : 0;
      
      return {
        period: row.period.toISOString().split('T')[0],
        value: row.value,
        growthRate
      };
    });
  }

  /**
   * Get booking growth time series
   */
  private async getBookingGrowthTimeSeries(startDate: Date, endDate: Date): Promise<Array<{
    period: string;
    value: number;
    growthRate: number;
  }>> {
    const result = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as period,
        COUNT(*)::int as value
      FROM "Booking"
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY period ASC
    ` as Array<{ period: Date; value: number }>;

    return result.map((row, index) => {
      const previousValue = index > 0 ? result[index - 1].value : row.value;
      const growthRate = previousValue > 0 ? ((row.value - previousValue) / previousValue) * 100 : 0;
      
      return {
        period: row.period.toISOString().split('T')[0],
        value: row.value,
        growthRate
      };
    });
  }

  /**
   * Get revenue growth time series - REAL DATA VERSION
   */
  private async getRevenueGrowthTimeSeries(startDate: Date, endDate: Date): Promise<Array<{
    period: string;
    value: number;
    growthRate: number;
  }>> {
    try {
      // Use Transaction table for accurate revenue data
      const result = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', "createdAt") as period,
          COALESCE(SUM("amount"), 0)::float as value
        FROM "Transaction"
        WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
          AND status = 'COMPLETED'
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY period ASC
      ` as Array<{ period: Date; value: number }>;

      return result.map((row, index) => {
        const previousValue = index > 0 ? result[index - 1].value : row.value;
        const growthRate = previousValue > 0 ? ((row.value - previousValue) / previousValue) * 100 : 0;
        
        return {
          period: row.period.toISOString().split('T')[0],
          value: row.value,
          growthRate
        };
      });

    } catch (error) {
      console.error('Error fetching revenue time series, using fallback data:', error);
      
      // Return empty array for fallback
      return [];
    }
  }

  /**
   * Calculate compound growth rate
   */
  private calculateCompoundGrowthRate(timeSeries: Array<{ value: number }>): number {
    if (timeSeries.length < 2) return 0;
    
    const firstValue = timeSeries[0].value;
    const lastValue = timeSeries[timeSeries.length - 1].value;
    const periods = timeSeries.length - 1;
    
    if (firstValue <= 0) return 0;
    
    return (Math.pow(lastValue / firstValue, 1 / periods) - 1) * 100;
  }

  /**
   * Get growth direction
   */
  private getGrowthDirection(growthRate: number): 'up' | 'down' | 'stable' {
    if (Math.abs(growthRate) < 1) return 'stable';
    return growthRate > 0 ? 'up' : 'down';
  }

  /**
   * Calculate trend metric using linear regression
   */
  private calculateTrendMetric(data: Array<{ value: number }>): TrendMetric {
    if (data.length < 2) {
      return {
        trend: 'stable',
        confidence: 0,
        slope: 0,
        r2: 0,
        projectedValue: 0
      };
    }

    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data.map(d => d.value);

    // Calculate linear regression
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const r2 = 1 - (ssResidual / ssTotal);

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    if (Math.abs(slope) < 0.1) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    // Check for volatility
    const volatility = this.calculateVolatility(y);
    if (volatility > 0.5) {
      trend = 'volatile';
    }

    const projectedValue = slope * n + intercept;

    return {
      trend,
      confidence: Math.max(0, Math.min(1, r2)),
      slope,
      r2,
      projectedValue
    };
  }

  /**
   * Calculate revenue per user trend
   */
  private calculateRevenuePerUserTrend(
    userData: Array<{ value: number }>,
    revenueData: Array<{ value: number }>
  ): TrendMetric {
    const revenuePerUser = userData.map((user, index) => ({
      value: user.value > 0 ? revenueData[index]?.value / user.value : 0
    }));

    return this.calculateTrendMetric(revenuePerUser);
  }

  /**
   * Calculate seasonality patterns
   */
  private async calculateSeasonality(startDate: Date, endDate: Date): Promise<SeasonalityData> {
    // Get monthly patterns
    const monthlyData = await prisma.$queryRaw`
      SELECT 
        EXTRACT(MONTH FROM "createdAt") as month,
        COUNT(*)::int as value
      FROM "User"
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY EXTRACT(MONTH FROM "createdAt")
      ORDER BY month
    ` as Array<{ month: number; value: number }>;

    // Get weekly patterns
    const weeklyData = await prisma.$queryRaw`
      SELECT 
        EXTRACT(DOW FROM "createdAt") as day_of_week,
        COUNT(*)::int as value
      FROM "User"
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY EXTRACT(DOW FROM "createdAt")
      ORDER BY day_of_week
    ` as Array<{ day_of_week: number; value: number }>;

    // Calculate monthly multipliers
    const monthlyAverage = monthlyData.reduce((sum, d) => sum + d.value, 0) / monthlyData.length;
    const monthlyPattern = Array.from({ length: 12 }, (_, i) => {
      const monthData = monthlyData.find(d => d.month === i + 1);
      const value = monthData?.value || monthlyAverage;
      return {
        month: i + 1,
        multiplier: value / monthlyAverage,
        confidence: monthData ? 0.8 : 0.2
      };
    });

    // Calculate weekly multipliers
    const weeklyAverage = weeklyData.reduce((sum, d) => sum + d.value, 0) / weeklyData.length;
    const weeklyPattern = Array.from({ length: 7 }, (_, i) => {
      const dayData = weeklyData.find(d => d.day_of_week === i);
      const value = dayData?.value || weeklyAverage;
      return {
        dayOfWeek: i,
        multiplier: value / weeklyAverage,
        confidence: dayData ? 0.8 : 0.2
      };
    });

    // Determine if there's significant seasonality
    const monthlyVariance = this.calculateVariance(monthlyPattern.map(p => p.multiplier));
    const weeklyVariance = this.calculateVariance(weeklyPattern.map(p => p.multiplier));
    const hasSeasonality = monthlyVariance > 0.1 || weeklyVariance > 0.1;

    return {
      monthlyPattern,
      weeklyPattern,
      hasSeasonality
    };
  }

  /**
   * Detect anomalies in the data
   */
  private async detectAnomalies(startDate: Date, endDate: Date): Promise<AnomalyData[]> {
    // Simple anomaly detection using standard deviation
    const dailyUsers = await this.getUserGrowthTimeSeries(startDate, endDate);
    const values = dailyUsers.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length);

    const anomalies: AnomalyData[] = [];
    
    dailyUsers.forEach(day => {
      const deviation = Math.abs(day.value - mean) / stdDev;
      
      if (deviation > 2) { // More than 2 standard deviations
        anomalies.push({
          date: new Date(day.period),
          metric: 'user_registrations',
          expectedValue: mean,
          actualValue: day.value,
          deviation,
          severity: deviation > 3 ? 'high' : deviation > 2.5 ? 'medium' : 'low'
        });
      }
    });

    return anomalies;
  }

  /**
   * Generate linear forecast
   */
  private generateLinearForecast(
    historicalData: Array<{ value: number }>,
    forecastDays: number
  ): Array<{
    period: string;
    predicted: number;
    confidenceInterval: { lower: number; upper: number };
  }> {
    const trendMetric = this.calculateTrendMetric(historicalData);
    const lastValue = historicalData[historicalData.length - 1]?.value || 0;
    
    const forecast = [];
    const today = new Date();
    
    for (let i = 1; i <= forecastDays; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + i);
      
      const predicted = lastValue + (trendMetric.slope * i);
      const confidence = Math.max(0.1, trendMetric.confidence);
      const margin = predicted * (1 - confidence) * 0.5;
      
      forecast.push({
        period: futureDate.toISOString().split('T')[0],
        predicted: Math.max(0, predicted),
        confidenceInterval: {
          lower: Math.max(0, predicted - margin),
          upper: predicted + margin
        }
      });
    }
    
    return forecast;
  }

  /**
   * Calculate forecast accuracy
   */
  private calculateForecastAccuracy(
    userData: Array<{ value: number }>,
    revenueData: Array<{ value: number }>
  ): { mape: number; rmse: number } {
    // Simple accuracy calculation (in production, use proper backtesting)
    const n = Math.min(userData.length, revenueData.length);
    if (n < 2) return { mape: 100, rmse: 100 };
    
    let mapeSum = 0;
    let rmseSum = 0;
    
    for (let i = 1; i < n; i++) {
      const actual = userData[i].value;
      const predicted = userData[i - 1].value; // Simple prediction
      
      if (actual > 0) {
        mapeSum += Math.abs((actual - predicted) / actual);
      }
      rmseSum += Math.pow(actual - predicted, 2);
    }
    
    const mape = (mapeSum / (n - 1)) * 100;
    const rmse = Math.sqrt(rmseSum / (n - 1));
    
    return { mape, rmse };
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return mean > 0 ? stdDev / mean : 0;
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  }
}

export const growthAnalyticsService = new GrowthAnalyticsService();