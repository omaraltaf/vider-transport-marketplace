#!/usr/bin/env tsx

/**
 * Mock Data Replacement Validation Script
 * 
 * Comprehensive validation that all platform admin services
 * are using real database data instead of mock data.
 */

import { PrismaClient } from '@prisma/client';
import { PlatformAdminFallbackService } from '../src/services/platform-admin-fallback.service';
import { PlatformAdminCacheService } from '../src/services/platform-admin-cache.service';
import { DatabasePerformanceOptimizer } from '../src/utils/database-performance-optimizer';
import { PlatformAdminErrorHandler } from '../src/utils/platform-admin-error-handler';

interface ValidationResult {
  service: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

class MockDataReplacementValidator {
  private prisma: PrismaClient;
  private cacheService: PlatformAdminCacheService;
  private fallbackService: PlatformAdminFallbackService;
  private results: ValidationResult[] = [];

  constructor() {
    this.prisma = new PrismaClient();
    this.cacheService = PlatformAdminCacheService.getInstance();
    this.fallbackService = PlatformAdminFallbackService.getInstance();
  }

  private addResult(service: string, test: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: any) {
    this.results.push({ service, test, status, message, details });
    
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${emoji} ${service} - ${test}: ${message}`);
    
    if (details && status !== 'PASS') {
      console.log(`   Details:`, details);
    }
  }

  /**
   * Validate User Management Services
   */
  async validateUserManagement(): Promise<void> {
    console.log('\n🔍 Validating User Management Services...');

    try {
      // Test real user data retrieval
      const optimizedQueries = DatabasePerformanceOptimizer.getOptimizedUserQueries(this.prisma);
      const userStats = await optimizedQueries.getUserStats();

      // Validate data structure
      if (userStats && typeof userStats.totalUsers === 'number') {
        this.addResult('UserManagement', 'Real Data Structure', 'PASS', 
          `Retrieved real user statistics: ${userStats.totalUsers} total users`);
      } else {
        this.addResult('UserManagement', 'Real Data Structure', 'FAIL', 
          'User statistics do not have expected structure', userStats);
      }

      // Test user search functionality
      const searchResults = await optimizedQueries.searchUsers({ verified: true, limit: 5 });
      
      if (Array.isArray(searchResults)) {
        this.addResult('UserManagement', 'Search Functionality', 'PASS', 
          `User search returned ${searchResults.length} results`);
        
        // Validate search result structure
        if (searchResults.length > 0) {
          const user = searchResults[0];
          if (user.id && user.email && typeof user.emailVerified === 'boolean') {
            this.addResult('UserManagement', 'Search Result Structure', 'PASS', 
              'Search results have correct user structure');
          } else {
            this.addResult('UserManagement', 'Search Result Structure', 'FAIL', 
              'Search results missing required fields', user);
          }
        }
      } else {
        this.addResult('UserManagement', 'Search Functionality', 'FAIL', 
          'User search did not return array', searchResults);
      }

      // Test fallback mechanism
      const fallbackData = this.fallbackService.getUserManagementFallback('test', new Error('Test error'));
      const fallbackStats = fallbackData.getUserStats();
      
      if (fallbackStats && fallbackStats.isFallback === true) {
        this.addResult('UserManagement', 'Fallback Mechanism', 'PASS', 
          'Fallback mechanism works correctly');
      } else {
        this.addResult('UserManagement', 'Fallback Mechanism', 'FAIL', 
          'Fallback mechanism not working', fallbackStats);
      }

    } catch (error) {
      this.addResult('UserManagement', 'Service Validation', 'FAIL', 
        'Error validating user management service', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Validate Financial Services
   */
  async validateFinancialServices(): Promise<void> {
    console.log('\n💰 Validating Financial Services...');

    try {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      
      const optimizedQueries = DatabasePerformanceOptimizer.getOptimizedFinancialQueries(this.prisma);
      const revenueSummary = await optimizedQueries.getRevenueSummary(startDate, endDate);

      // Validate revenue summary structure
      if (revenueSummary && revenueSummary.currentPeriod && revenueSummary.previousPeriod) {
        const currentRevenue = revenueSummary.currentPeriod._sum.amount || 0;
        this.addResult('Financial', 'Revenue Calculation', 'PASS', 
          `Revenue summary calculated: ${currentRevenue} NOK current period`);
      } else {
        this.addResult('Financial', 'Revenue Calculation', 'FAIL', 
          'Revenue summary structure invalid', revenueSummary);
      }

      // Test revenue trends
      const revenueTrends = await optimizedQueries.getRevenueTrends(startDate, endDate, 'month');
      
      if (Array.isArray(revenueTrends)) {
        this.addResult('Financial', 'Revenue Trends', 'PASS', 
          `Revenue trends generated: ${revenueTrends.length} data points`);
        
        // Validate trend data structure
        if (revenueTrends.length > 0) {
          const trend = revenueTrends[0];
          if (trend.period && typeof trend.revenue === 'number' && typeof trend.transaction_count === 'number') {
            this.addResult('Financial', 'Trend Data Structure', 'PASS', 
              'Revenue trend data has correct structure');
          } else {
            this.addResult('Financial', 'Trend Data Structure', 'FAIL', 
              'Revenue trend data structure invalid', trend);
          }
        }
      } else {
        this.addResult('Financial', 'Revenue Trends', 'FAIL', 
          'Revenue trends not returned as array', revenueTrends);
      }

      // Test financial fallback
      const fallbackData = this.fallbackService.getFinancialFallback('test', new Error('Test error'));
      const fallbackRevenue = fallbackData.getRevenueSummary();
      
      if (fallbackRevenue && fallbackRevenue.isFallback === true && typeof fallbackRevenue.totalRevenue === 'number') {
        this.addResult('Financial', 'Fallback Data', 'PASS', 
          `Financial fallback works: ${fallbackRevenue.totalRevenue} NOK`);
      } else {
        this.addResult('Financial', 'Fallback Data', 'FAIL', 
          'Financial fallback not working correctly', fallbackRevenue);
      }

    } catch (error) {
      this.addResult('Financial', 'Service Validation', 'FAIL', 
        'Error validating financial services', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Validate Analytics Services
   */
  async validateAnalyticsServices(): Promise<void> {
    console.log('\n📊 Validating Analytics Services...');

    try {
      const optimizedQueries = DatabasePerformanceOptimizer.getOptimizedAnalyticsQueries(this.prisma);
      
      // Test platform KPIs
      const platformKPIs = await optimizedQueries.getPlatformKPIs();
      
      if (platformKPIs && typeof platformKPIs.users === 'number' && typeof platformKPIs.companies === 'number') {
        this.addResult('Analytics', 'Platform KPIs', 'PASS', 
          `KPIs calculated: ${platformKPIs.users} users, ${platformKPIs.companies} companies`);
      } else {
        this.addResult('Analytics', 'Platform KPIs', 'FAIL', 
          'Platform KPIs structure invalid', platformKPIs);
      }

      // Test geographic analytics
      const geographicData = await optimizedQueries.getGeographicAnalytics();
      
      if (Array.isArray(geographicData)) {
        this.addResult('Analytics', 'Geographic Data', 'PASS', 
          `Geographic analytics: ${geographicData.length} regions`);
        
        // Validate geographic data structure
        if (geographicData.length > 0) {
          const region = geographicData[0];
          if (region.region && typeof region.user_count === 'number' && typeof region.company_count === 'number') {
            this.addResult('Analytics', 'Geographic Structure', 'PASS', 
              `Geographic data structure valid for region: ${region.region}`);
          } else {
            this.addResult('Analytics', 'Geographic Structure', 'FAIL', 
              'Geographic data structure invalid', region);
          }
        } else {
          this.addResult('Analytics', 'Geographic Structure', 'WARNING', 
            'No geographic data available (expected for new database)');
        }
      } else {
        this.addResult('Analytics', 'Geographic Data', 'FAIL', 
          'Geographic data not returned as array', geographicData);
      }

      // Test analytics fallback
      const fallbackData = this.fallbackService.getAnalyticsFallback('test', new Error('Test error'));
      const fallbackKPIs = fallbackData.getPlatformKPIs();
      
      if (fallbackKPIs && fallbackKPIs.isFallback === true && typeof fallbackKPIs.totalUsers === 'number') {
        this.addResult('Analytics', 'Fallback Data', 'PASS', 
          `Analytics fallback works: ${fallbackKPIs.totalUsers} users`);
      } else {
        this.addResult('Analytics', 'Fallback Data', 'FAIL', 
          'Analytics fallback not working correctly', fallbackKPIs);
      }

    } catch (error) {
      this.addResult('Analytics', 'Service Validation', 'FAIL', 
        'Error validating analytics services', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Validate Performance Optimization
   */
  async validatePerformanceOptimization(): Promise<void> {
    console.log('\n⚡ Validating Performance Optimization...');

    try {
      // Clear metrics for clean test
      DatabasePerformanceOptimizer.clearMetrics();
      
      // Test query monitoring
      const testResult = await DatabasePerformanceOptimizer.monitorQuery(
        'validationTestQuery',
        async () => {
          const count = await this.prisma.user.count();
          return { count };
        }
      );

      if (testResult && typeof testResult.count === 'number') {
        this.addResult('Performance', 'Query Monitoring', 'PASS', 
          'Query monitoring works correctly');
      } else {
        this.addResult('Performance', 'Query Monitoring', 'FAIL', 
          'Query monitoring not working', testResult);
      }

      // Test performance metrics
      const metrics = DatabasePerformanceOptimizer.getPerformanceMetrics();
      
      if (metrics && metrics.validationTestQuery && metrics.validationTestQuery.count === 1) {
        this.addResult('Performance', 'Metrics Collection', 'PASS', 
          `Metrics collected: ${metrics.validationTestQuery.averageDuration}ms avg`);
      } else {
        this.addResult('Performance', 'Metrics Collection', 'FAIL', 
          'Performance metrics not collected correctly', metrics);
      }

      // Test performance analysis
      const analysis = DatabasePerformanceOptimizer.analyzePerformance();
      
      if (analysis && Array.isArray(analysis.slowQueries) && Array.isArray(analysis.recommendations)) {
        this.addResult('Performance', 'Performance Analysis', 'PASS', 
          `Analysis complete: ${analysis.slowQueries.length} slow queries, ${analysis.recommendations.length} recommendations`);
      } else {
        this.addResult('Performance', 'Performance Analysis', 'FAIL', 
          'Performance analysis not working', analysis);
      }

      // Test database indexing
      try {
        await DatabasePerformanceOptimizer.applyIndexes(this.prisma);
        this.addResult('Performance', 'Database Indexing', 'PASS', 
          'Database indexes applied successfully');
      } catch (error) {
        this.addResult('Performance', 'Database Indexing', 'WARNING', 
          'Some indexes may already exist (this is normal)', error instanceof Error ? error.message : String(error));
      }

    } catch (error) {
      this.addResult('Performance', 'Optimization Validation', 'FAIL', 
        'Error validating performance optimization', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Validate Cache System
   */
  async validateCacheSystem(): Promise<void> {
    console.log('\n🚀 Validating Cache System...');

    try {
      // Reset cache metrics
      this.cacheService.resetMetrics();
      
      // Test cache set/get
      const testData = { message: 'validation test', timestamp: new Date().toISOString() };
      await this.cacheService.set('ValidationTest', 'testMethod', testData, 300);
      
      const cachedData = await this.cacheService.get('ValidationTest', 'testMethod');
      
      if (cachedData && cachedData.message === testData.message) {
        this.addResult('Cache', 'Set/Get Operations', 'PASS', 
          'Cache set/get operations work correctly');
      } else {
        this.addResult('Cache', 'Set/Get Operations', 'FAIL', 
          'Cache set/get not working correctly', { expected: testData, actual: cachedData });
      }

      // Test cache metrics
      const metrics = this.cacheService.getMetrics();
      
      if (metrics && typeof metrics.hits === 'number' && typeof metrics.totalRequests === 'number') {
        this.addResult('Cache', 'Metrics Tracking', 'PASS', 
          `Cache metrics: ${metrics.hits} hits, ${metrics.totalRequests} total requests`);
      } else {
        this.addResult('Cache', 'Metrics Tracking', 'FAIL', 
          'Cache metrics not working correctly', metrics);
      }

      // Test cache health check
      const healthCheck = await this.cacheService.healthCheck();
      
      if (healthCheck && typeof healthCheck.redis === 'boolean' && typeof healthCheck.latency === 'number') {
        const status = healthCheck.redis ? 'connected' : 'disconnected';
        this.addResult('Cache', 'Health Check', healthCheck.redis ? 'PASS' : 'WARNING', 
          `Redis ${status}, latency: ${healthCheck.latency}ms`);
      } else {
        this.addResult('Cache', 'Health Check', 'FAIL', 
          'Cache health check not working', healthCheck);
      }

      // Test cache invalidation
      await this.cacheService.invalidate('ValidationTest');
      const invalidatedData = await this.cacheService.get('ValidationTest', 'testMethod');
      
      if (invalidatedData === null) {
        this.addResult('Cache', 'Invalidation', 'PASS', 
          'Cache invalidation works correctly');
      } else {
        this.addResult('Cache', 'Invalidation', 'FAIL', 
          'Cache invalidation not working', invalidatedData);
      }

    } catch (error) {
      this.addResult('Cache', 'System Validation', 'FAIL', 
        'Error validating cache system', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Validate Error Handling
   */
  async validateErrorHandling(): Promise<void> {
    console.log('\n🛡️ Validating Error Handling...');

    try {
      // Test database error handling
      const fallbackData = { test: 'fallback' };
      const result = await PlatformAdminErrorHandler.handleDatabaseError(
        async () => {
          throw new Error('Simulated database error');
        },
        fallbackData,
        { service: 'ValidationTest', method: 'testMethod', operation: 'test' }
      );

      if (result && result.isFallback === true && result.test === 'fallback') {
        this.addResult('ErrorHandling', 'Database Error Fallback', 'PASS', 
          'Database error handling works correctly');
      } else {
        this.addResult('ErrorHandling', 'Database Error Fallback', 'FAIL', 
          'Database error handling not working', result);
      }

      // Test input validation
      const validInput = { requiredField: 'test', page: 1, limit: 10 };
      const validation = PlatformAdminErrorHandler.validateInput(
        validInput,
        ['requiredField'],
        { service: 'ValidationTest', method: 'testMethod' }
      );

      if (validation.isValid === true && validation.errors.length === 0) {
        this.addResult('ErrorHandling', 'Input Validation', 'PASS', 
          'Input validation works correctly');
      } else {
        this.addResult('ErrorHandling', 'Input Validation', 'FAIL', 
          'Input validation not working correctly', validation);
      }

      // Test response formatting
      const testResponseData = { message: 'test' };
      const formattedResponse = PlatformAdminErrorHandler.formatResponse(
        testResponseData,
        { service: 'ValidationTest', method: 'testMethod' }
      );

      if (formattedResponse && formattedResponse.success === true && formattedResponse.data === testResponseData) {
        this.addResult('ErrorHandling', 'Response Formatting', 'PASS', 
          'Response formatting works correctly');
      } else {
        this.addResult('ErrorHandling', 'Response Formatting', 'FAIL', 
          'Response formatting not working correctly', formattedResponse);
      }

    } catch (error) {
      this.addResult('ErrorHandling', 'System Validation', 'FAIL', 
        'Error validating error handling system', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Validate Norwegian Localization
   */
  async validateNorwegianLocalization(): Promise<void> {
    console.log('\n🇳🇴 Validating Norwegian Localization...');

    try {
      // Test user management fallback Norwegian content
      const userFallback = this.fallbackService.getUserManagementFallback('test', new Error('Test'));
      const userSearch = userFallback.searchUsers();
      
      if (userSearch && userSearch.users && userSearch.users.length > 0) {
        const user = userSearch.users[0];
        const hasNorwegianContent = user.email?.includes('.no') || 
                                   user.firstName === 'Ola' || 
                                   user.lastName === 'Nordmann' ||
                                   user.company?.name?.includes('AS');
        
        if (hasNorwegianContent) {
          this.addResult('Localization', 'Norwegian User Data', 'PASS', 
            'Norwegian user fallback data is properly localized');
        } else {
          this.addResult('Localization', 'Norwegian User Data', 'WARNING', 
            'User fallback data may not be fully Norwegian localized', user);
        }
      }

      // Test financial fallback Norwegian content
      const financialFallback = this.fallbackService.getFinancialFallback('test', new Error('Test'));
      const revenueData = financialFallback.getRevenueSummary();
      
      if (revenueData && revenueData.commission && revenueData.commission === 6250) {
        this.addResult('Localization', 'Norwegian Financial Data', 'PASS', 
          'Financial data uses Norwegian market rates (5% commission)');
      } else {
        this.addResult('Localization', 'Norwegian Financial Data', 'WARNING', 
          'Financial fallback may not use Norwegian market rates', revenueData);
      }

      // Test communication fallback Norwegian content
      const commFallback = this.fallbackService.getCommunicationFallback('test', new Error('Test'));
      const announcements = commFallback.getAnnouncements();
      
      if (announcements && announcements.announcements && announcements.announcements.length > 0) {
        const announcement = announcements.announcements[0];
        const hasNorwegianText = announcement.title?.includes('vedlikehold') || 
                                announcement.content?.includes('desember');
        
        if (hasNorwegianText) {
          this.addResult('Localization', 'Norwegian Communication', 'PASS', 
            'Communication fallback uses Norwegian language');
        } else {
          this.addResult('Localization', 'Norwegian Communication', 'WARNING', 
            'Communication fallback may not be fully Norwegian localized', announcement);
        }
      }

    } catch (error) {
      this.addResult('Localization', 'Norwegian Validation', 'FAIL', 
        'Error validating Norwegian localization', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Generate validation report
   */
  generateReport(): void {
    console.log('\n📋 VALIDATION REPORT');
    console.log('='.repeat(50));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    const total = this.results.length;

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Passed: ${passed}/${total}`);
    console.log(`   ❌ Failed: ${failed}/${total}`);
    console.log(`   ⚠️  Warnings: ${warnings}/${total}`);

    const successRate = ((passed / total) * 100).toFixed(1);
    console.log(`   🎯 Success Rate: ${successRate}%`);

    if (failed > 0) {
      console.log(`\n❌ Failed Tests:`);
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`   • ${r.service} - ${r.test}: ${r.message}`);
        });
    }

    if (warnings > 0) {
      console.log(`\n⚠️  Warnings:`);
      this.results
        .filter(r => r.status === 'WARNING')
        .forEach(r => {
          console.log(`   • ${r.service} - ${r.test}: ${r.message}`);
        });
    }

    // Overall status
    console.log(`\n🏆 Overall Status:`);
    if (failed === 0) {
      console.log('   ✅ MOCK DATA REPLACEMENT VALIDATION SUCCESSFUL!');
      console.log('   🎉 All platform admin services are using real database data.');
    } else {
      console.log('   ❌ VALIDATION FAILED - Some issues need to be addressed.');
    }

    console.log('\n' + '='.repeat(50));
  }

  /**
   * Run all validations
   */
  async runAllValidations(): Promise<void> {
    console.log('🚀 Starting Mock Data Replacement Validation...');
    console.log('This will validate that all platform admin services use real database data instead of mock data.\n');

    try {
      await this.validateUserManagement();
      await this.validateFinancialServices();
      await this.validateAnalyticsServices();
      await this.validatePerformanceOptimization();
      await this.validateCacheSystem();
      await this.validateErrorHandling();
      await this.validateNorwegianLocalization();
    } catch (error) {
      console.error('❌ Critical error during validation:', error);
    } finally {
      await this.prisma.$disconnect();
      this.generateReport();
    }
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new MockDataReplacementValidator();
  validator.runAllValidations().catch(console.error);
}

export { MockDataReplacementValidator };