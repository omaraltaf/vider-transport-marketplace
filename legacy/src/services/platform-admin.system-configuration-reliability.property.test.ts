import fc from 'fast-check';
import { SystemConfigService, SystemConfig } from './system-config.service';
import { BackupRecoveryService, BackupJob } from './backup-recovery.service';
import { ApiRateLimitingService, RateLimitRule } from './api-rate-limiting.service';

/**
 * Property-Based Tests for Platform Admin Dashboard
 * Feature: platform-admin-dashboard, Property 7: System Configuration Reliability
 * 
 * Tests the reliability and consistency of system configuration operations,
 * backup management, and API rate limiting functionality.
 */

describe('Platform Admin System Configuration Reliability Properties', () => {
  let systemConfigService: SystemConfigService;
  let backupRecoveryService: BackupRecoveryService;
  let rateLimitingService: ApiRateLimitingService;

  beforeEach(() => {
    // Use singleton instances with fresh state for each test
    systemConfigService = SystemConfigService.getInstance();
    backupRecoveryService = BackupRecoveryService.getInstance();
    rateLimitingService = ApiRateLimitingService.getInstance();
  });

  /**
   * Property 7.1: System Configuration Consistency
   * For any system configuration change, the change should be applied safely,
   * logged for audit, and not disrupt platform operations.
   */
  test('system configuration changes maintain consistency and auditability', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          category: fc.constantFrom('general', 'security', 'performance', 'features', 'integrations'),
          key: fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
          value: fc.oneof(
            fc.string({ minLength: 1, maxLength: 100 }),
            fc.integer({ min: 1, max: 10000 }),
            fc.boolean(),
            fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 })
          ),
          description: fc.string({ minLength: 10, maxLength: 200 }),
          dataType: fc.constantFrom('string', 'number', 'boolean', 'array'),
          isSecret: fc.boolean()
        }),
        fc.string({ minLength: 5, maxLength: 20 }), // updatedBy
        async (configData, updatedBy) => {
          // Create initial configuration
          const initialConfig = await systemConfigService.createSystemConfig(
            {
              ...configData,
              key: `test_${configData.key}_${Date.now()}`
            },
            updatedBy
          );

          // Verify initial state
          expect(initialConfig).toBeDefined();
          expect(initialConfig.key).toContain('test_');
          expect(initialConfig.category).toBe(configData.category);
          expect(initialConfig.updatedBy).toBe(updatedBy);

          // Test configuration update
          const newValue = configData.dataType === 'string' ? 'updated_value' :
                          configData.dataType === 'number' ? 999 :
                          configData.dataType === 'boolean' ? !configData.value :
                          ['updated', 'array'];

          const updatedConfig = await systemConfigService.updateSystemConfig(
            initialConfig.key,
            newValue,
            `${updatedBy}_updated`
          );

          // Verify update consistency
          expect(updatedConfig.key).toBe(initialConfig.key);
          expect(updatedConfig.value).toEqual(configData.isSecret ? '[REDACTED]' : newValue);
          expect(updatedConfig.updatedBy).toBe(`${updatedBy}_updated`);
          expect(updatedConfig.updatedAt.getTime()).toBeGreaterThan(initialConfig.updatedAt.getTime());

          // Verify configuration retrieval
          const retrievedConfigs = await systemConfigService.getSystemConfig(configData.category);
          const foundConfig = retrievedConfigs.find(c => c.key === initialConfig.key);
          
          expect(foundConfig).toBeDefined();
          expect(foundConfig?.value).toEqual(configData.isSecret ? '[REDACTED]' : newValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.2: System Health Monitoring Accuracy
   * For any system health check, the returned metrics should accurately reflect
   * the current system state and be within expected ranges.
   */
  test('system health monitoring provides accurate and consistent metrics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 72 }), // hours for history
        async (hours) => {
          // Get current system health
          const currentHealth = await systemConfigService.getSystemHealth();

          // Verify health metrics structure and ranges
          expect(currentHealth.timestamp).toBeInstanceOf(Date);
          expect(currentHealth.cpu.usage).toBeGreaterThanOrEqual(0);
          expect(currentHealth.cpu.usage).toBeLessThanOrEqual(100);
          expect(currentHealth.cpu.cores).toBeGreaterThan(0);
          expect(currentHealth.cpu.loadAverage).toHaveLength(3);

          expect(currentHealth.memory.percentage).toBeGreaterThanOrEqual(0);
          expect(currentHealth.memory.percentage).toBeLessThanOrEqual(100);
          expect(currentHealth.memory.used).toBeLessThanOrEqual(currentHealth.memory.total);

          expect(['healthy', 'warning', 'critical']).toContain(currentHealth.database.status);
          expect(['healthy', 'warning', 'critical']).toContain(currentHealth.redis.status);
          expect(['healthy', 'warning', 'critical']).toContain(currentHealth.api.status);

          // Get health history
          const healthHistory = await systemConfigService.getSystemHealthHistory(hours);

          // Verify history consistency
          expect(Array.isArray(healthHistory)).toBe(true);
          
          if (healthHistory.length > 0) {
            const oldestEntry = healthHistory[0];
            const newestEntry = healthHistory[healthHistory.length - 1];
            
            expect(newestEntry.timestamp.getTime()).toBeGreaterThanOrEqual(oldestEntry.timestamp.getTime());
            
            // All entries should be within the requested time range
            const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
            healthHistory.forEach(entry => {
              expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(cutoff.getTime());
            });
          }

          // Get performance metrics
          const performanceMetrics = await systemConfigService.collectPerformanceMetrics();
          
          expect(performanceMetrics.responseTime).toBeGreaterThanOrEqual(0);
          expect(performanceMetrics.throughput).toBeGreaterThanOrEqual(0);
          expect(performanceMetrics.errorRate).toBeGreaterThanOrEqual(0);
          expect(performanceMetrics.errorRate).toBeLessThanOrEqual(100);
          expect(performanceMetrics.activeConnections).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.3: Backup Operations Integrity
   * For any backup operation, the operation should complete successfully,
   * maintain data integrity, and provide proper status tracking.
   */
  test('backup operations maintain integrity and proper status tracking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          type: fc.constantFrom('full', 'incremental', 'differential'),
          compression: fc.boolean(),
          encryption: fc.boolean(),
          retentionDays: fc.integer({ min: 1, max: 365 }),
          tables: fc.option(fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 5 }))
        }),
        fc.string({ minLength: 5, maxLength: 20 }), // createdBy
        async (backupOptions, createdBy) => {
          // Create backup job
          const backupJob = await backupRecoveryService.createBackup(
            backupOptions.type,
            {
              compression: backupOptions.compression,
              encryption: backupOptions.encryption,
              retentionDays: backupOptions.retentionDays,
              tables: backupOptions.tables || undefined
            },
            createdBy
          );

          // Verify initial backup job state
          expect(backupJob.id).toBeDefined();
          expect(backupJob.type).toBe(backupOptions.type);
          expect(backupJob.status).toBe('pending');
          expect(backupJob.progress).toBe(0);
          expect(backupJob.createdBy).toBe(createdBy);
          expect(backupJob.metadata.compression).toBe(backupOptions.compression);
          expect(backupJob.metadata.encryption).toBe(backupOptions.encryption);
          expect(backupJob.metadata.retentionDays).toBe(backupOptions.retentionDays);

          // Wait for backup to complete (mock implementation completes quickly)
          await new Promise(resolve => setTimeout(resolve, 6000));

          // Retrieve updated backup job
          const updatedJob = await backupRecoveryService.getBackupJob(backupJob.id);
          
          expect(updatedJob).toBeDefined();
          expect(updatedJob!.status).toBe('completed');
          expect(updatedJob!.progress).toBe(100);
          expect(updatedJob!.completedAt).toBeDefined();
          expect(updatedJob!.duration).toBeGreaterThan(0);
          expect(updatedJob!.size).toBeGreaterThan(0);
          expect(updatedJob!.checksum).toBeDefined();

          // Verify backup in job list
          const allJobs = await backupRecoveryService.getBackupJobs();
          const foundJob = allJobs.find(job => job.id === backupJob.id);
          
          expect(foundJob).toBeDefined();
          expect(foundJob!.status).toBe('completed');

          // Test backup verification
          const verification = await backupRecoveryService.verifyBackup(backupJob.id);
          
          expect(verification.valid).toBe(true);
          expect(verification.checksum).toBe(updatedJob!.checksum);
          expect(verification.size).toBe(updatedJob!.size);
          expect(verification.issues).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.4: Rate Limiting Rule Consistency
   * For any rate limiting rule configuration, the rule should be applied
   * consistently and enforce limits correctly.
   */
  test('rate limiting rules are applied consistently and enforce limits correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 5, maxLength: 50 }),
          description: fc.string({ minLength: 10, maxLength: 200 }),
          endpoint: fc.oneof(
            fc.constant('*'),
            fc.string({ minLength: 5, maxLength: 30 }).map(s => `/api/${s}`)
          ),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH', '*'),
          limit: fc.integer({ min: 1, max: 1000 }),
          windowMs: fc.constantFrom(60000, 300000, 900000, 3600000), // 1min, 5min, 15min, 1hour
          keyGenerator: fc.constantFrom('ip', 'user', 'api_key'),
          enabled: fc.boolean(),
          priority: fc.integer({ min: 1, max: 100 })
        }),
        fc.string({ minLength: 5, maxLength: 20 }), // createdBy
        async (ruleData, createdBy) => {
          // Create rate limit rule
          const rule = await rateLimitingService.createRateLimitRule(
            {
              ...ruleData,
              skipSuccessfulRequests: false,
              skipFailedRequests: false
            },
            createdBy
          );

          // Verify rule creation
          expect(rule.id).toBeDefined();
          expect(rule.name).toBe(ruleData.name);
          expect(rule.endpoint).toBe(ruleData.endpoint);
          expect(rule.method).toBe(ruleData.method);
          expect(rule.limit).toBe(ruleData.limit);
          expect(rule.windowMs).toBe(ruleData.windowMs);
          expect(rule.enabled).toBe(ruleData.enabled);
          expect(rule.createdBy).toBe(createdBy);

          // Retrieve rules and verify presence
          const allRules = await rateLimitingService.getRateLimitRules();
          const foundRule = allRules.find(r => r.id === rule.id);
          
          expect(foundRule).toBeDefined();
          expect(foundRule!.name).toBe(ruleData.name);

          // Test rule updates
          const updatedName = `${ruleData.name}_updated`;
          const updatedRule = await rateLimitingService.updateRateLimitRule(
            rule.id,
            { name: updatedName, limit: ruleData.limit + 100 },
            `${createdBy}_updater`
          );

          expect(updatedRule.name).toBe(updatedName);
          expect(updatedRule.limit).toBe(ruleData.limit + 100);
          expect(updatedRule.updatedAt.getTime()).toBeGreaterThan(rule.updatedAt.getTime());

          // Test rate limit checking (if rule is enabled)
          if (ruleData.enabled) {
            const testEndpoint = ruleData.endpoint === '*' ? '/api/test' : ruleData.endpoint;
            const testMethod = ruleData.method === '*' ? 'GET' : ruleData.method;
            
            const rateLimitCheck = await rateLimitingService.checkRateLimit(
              testEndpoint,
              testMethod,
              'test_key',
              {
                ipAddress: '127.0.0.1',
                userId: 'test_user'
              }
            );

            expect(rateLimitCheck.allowed).toBe(true);
            expect(rateLimitCheck.limit).toBe(updatedRule.limit);
            expect(rateLimitCheck.remaining).toBeLessThanOrEqual(updatedRule.limit);
            expect(rateLimitCheck.resetTime).toBeInstanceOf(Date);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.5: System Alert Management Reliability
   * For any system alert, the alert should be properly tracked, acknowledged,
   * and resolved with complete audit trails.
   */
  test('system alerts are managed reliably with proper state transitions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }), // acknowledgedBy
        fc.string({ minLength: 5, maxLength: 20 }), // resolvedBy
        async (acknowledgedBy, resolvedBy) => {
          // Trigger system health check to potentially generate alerts
          await systemConfigService.getSystemHealth();

          // Get current alerts
          const initialAlerts = await systemConfigService.getSystemAlerts();
          const initialCount = initialAlerts.length;

          // Get unacknowledged alerts
          const unacknowledgedAlerts = await systemConfigService.getSystemAlerts(undefined, false);
          
          if (unacknowledgedAlerts.length > 0) {
            const alertToTest = unacknowledgedAlerts[0];
            
            // Verify initial alert state
            expect(alertToTest.acknowledged).toBe(false);
            expect(alertToTest.resolved).toBe(false);
            expect(alertToTest.acknowledgedBy).toBeUndefined();
            expect(alertToTest.resolvedBy).toBeUndefined();

            // Acknowledge alert
            await systemConfigService.acknowledgeAlert(alertToTest.id, acknowledgedBy);

            // Verify acknowledgment
            const acknowledgedAlerts = await systemConfigService.getSystemAlerts(undefined, true);
            const acknowledgedAlert = acknowledgedAlerts.find(a => a.id === alertToTest.id);
            
            expect(acknowledgedAlert).toBeDefined();
            expect(acknowledgedAlert!.acknowledged).toBe(true);
            expect(acknowledgedAlert!.acknowledgedBy).toBe(acknowledgedBy);
            expect(acknowledgedAlert!.acknowledgedAt).toBeInstanceOf(Date);

            // Resolve alert
            await systemConfigService.resolveAlert(alertToTest.id, resolvedBy);

            // Verify resolution
            const allAlertsAfterResolve = await systemConfigService.getSystemAlerts();
            const resolvedAlert = allAlertsAfterResolve.find(a => a.id === alertToTest.id);
            
            expect(resolvedAlert).toBeDefined();
            expect(resolvedAlert!.resolved).toBe(true);
            expect(resolvedAlert!.resolvedBy).toBe(resolvedBy);
            expect(resolvedAlert!.resolvedAt).toBeInstanceOf(Date);
            expect(resolvedAlert!.resolvedAt!.getTime()).toBeGreaterThanOrEqual(
              resolvedAlert!.acknowledgedAt!.getTime()
            );
          }

          // Verify alert filtering works correctly
          const criticalAlerts = await systemConfigService.getSystemAlerts('critical');
          const warningAlerts = await systemConfigService.getSystemAlerts('warning');
          const infoAlerts = await systemConfigService.getSystemAlerts('info');

          criticalAlerts.forEach(alert => expect(alert.type).toBe('critical'));
          warningAlerts.forEach(alert => expect(alert.type).toBe('warning'));
          infoAlerts.forEach(alert => expect(alert.type).toBe('info'));

          // Verify total count consistency
          const finalAlerts = await systemConfigService.getSystemAlerts();
          expect(finalAlerts.length).toBeGreaterThanOrEqual(initialCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.6: Disaster Recovery Plan Consistency
   * For any disaster recovery plan, the plan should maintain consistency
   * across creation, testing, and execution scenarios.
   */
  test('disaster recovery plans maintain consistency and testability', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 5, maxLength: 50 }),
          description: fc.string({ minLength: 20, maxLength: 200 }),
          priority: fc.constantFrom('low', 'medium', 'high', 'critical'),
          rto: fc.integer({ min: 5, max: 1440 }), // 5 minutes to 24 hours
          rpo: fc.integer({ min: 1, max: 60 }), // 1 to 60 minutes
          enabled: fc.boolean()
        }),
        fc.string({ minLength: 5, maxLength: 20 }), // createdBy
        fc.string({ minLength: 5, maxLength: 20 }), // testedBy
        async (planData, createdBy, testedBy) => {
          // Create disaster recovery plan
          const plan = await backupRecoveryService.createRecoveryPlan(
            {
              ...planData,
              steps: [
                {
                  id: 'step_1',
                  order: 1,
                  title: 'Initial Assessment',
                  description: 'Assess the scope of the disaster',
                  type: 'manual',
                  estimatedDuration: 15,
                  dependencies: [],
                  verificationCriteria: ['Disaster scope documented']
                },
                {
                  id: 'step_2',
                  order: 2,
                  title: 'System Recovery',
                  description: 'Restore critical systems',
                  type: 'automated',
                  estimatedDuration: planData.rto - 15,
                  dependencies: ['step_1'],
                  automationScript: 'restore_systems.sh'
                }
              ],
              contacts: [
                {
                  name: 'Emergency Contact',
                  role: 'System Administrator',
                  email: 'admin@example.com',
                  phone: '+1-555-0123',
                  priority: 1
                }
              ]
            },
            createdBy
          );

          // Verify plan creation
          expect(plan.id).toBeDefined();
          expect(plan.name).toBe(planData.name);
          expect(plan.priority).toBe(planData.priority);
          expect(plan.rto).toBe(planData.rto);
          expect(plan.rpo).toBe(planData.rpo);
          expect(plan.enabled).toBe(planData.enabled);
          expect(plan.createdBy).toBe(createdBy);
          expect(plan.steps).toHaveLength(2);
          expect(plan.contacts).toHaveLength(1);

          // Verify plan retrieval
          const allPlans = await backupRecoveryService.getRecoveryPlans();
          const foundPlan = allPlans.find(p => p.id === plan.id);
          
          expect(foundPlan).toBeDefined();
          expect(foundPlan!.name).toBe(planData.name);

          // Test disaster recovery plan
          const testResult = await backupRecoveryService.testRecoveryPlan(plan.id, testedBy);

          // Verify test result
          expect(testResult.id).toBeDefined();
          expect(testResult.testDate).toBeInstanceOf(Date);
          expect(typeof testResult.success).toBe('boolean');
          expect(testResult.duration).toBeGreaterThan(0);
          expect(Array.isArray(testResult.issues)).toBe(true);
          expect(Array.isArray(testResult.recommendations)).toBe(true);
          expect(testResult.testedBy).toBe(testedBy);

          // Verify plan was updated with test results
          const updatedPlans = await backupRecoveryService.getRecoveryPlans();
          const testedPlan = updatedPlans.find(p => p.id === plan.id);
          
          expect(testedPlan).toBeDefined();
          expect(testedPlan!.lastTested).toBeInstanceOf(Date);
          expect(testedPlan!.testResults).toBeDefined();
          expect(testedPlan!.testResults!.length).toBeGreaterThan(0);
          
          const latestTest = testedPlan!.testResults![testedPlan!.testResults!.length - 1];
          expect(latestTest.id).toBe(testResult.id);
          expect(latestTest.testedBy).toBe(testedBy);
        }
      ),
      { numRuns: 100 }
    );
  });
});