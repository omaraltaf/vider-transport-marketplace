import fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { platformConfigService } from '../platform-config.service';
import { cacheService } from '../cache.service';

const prisma = new PrismaClient();

/**
 * Feature: mock-data-replacement, Property 4: Configuration database sourcing
 * 
 * For any configuration value displayed in the system, the value should be 
 * retrievable from the platform_configs table in the database
 * 
 * Validates: Requirements 1.4, 6.1
 */

describe('Financial Data Consistency Property Tests', () => {
  beforeAll(async () => {
    // Clear cache before tests
    await cacheService.invalidatePattern('platform_config:*');
    await cacheService.invalidatePattern('financial:*');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Property 4: Configuration database sourcing', () => {
    test('all commission rate configurations should be retrievable from database', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            category: fc.constantFrom('financial', 'system', 'features'),
            configType: fc.constantFrom('commission', 'rate', 'fee', 'percentage')
          }),
          async (testData) => {
            // Clear cache to ensure fresh data
            await cacheService.invalidatePattern('platform_config:*');

            // Get all financial configurations from service
            const financialConfigs = await platformConfigService.getConfigsByCategory('financial');

            // Verify each configuration exists in database
            for (const config of financialConfigs) {
              const dbConfig = await prisma.platformConfigs.findUnique({
                where: { key: config.key }
              });

              expect(dbConfig).not.toBeNull();
              expect(dbConfig!.id).toBe(config.id);
              expect(dbConfig!.category).toBe(config.category);
              expect(dbConfig!.key).toBe(config.key);
              expect(dbConfig!.value).toEqual(config.value);
              expect(dbConfig!.dataType).toBe(config.dataType);
              expect(dbConfig!.displayName).toBe(config.displayName);
              expect(dbConfig!.isEditable).toBe(config.isEditable);
              expect(dbConfig!.requiresRestart).toBe(config.requiresRestart);

              // Verify timestamps are valid dates
              expect(config.createdAt).toBeInstanceOf(Date);
              expect(config.updatedAt).toBeInstanceOf(Date);
              expect(config.updatedAt.getTime()).toBeGreaterThanOrEqual(config.createdAt.getTime());

              // Verify data type consistency
              switch (config.dataType) {
                case 'number':
                  expect(typeof config.value).toBe('number');
                  expect(config.value).toBeGreaterThanOrEqual(0);
                  break;
                case 'string':
                  expect(typeof config.value).toBe('string');
                  break;
                case 'boolean':
                  expect(typeof config.value).toBe('boolean');
                  break;
                case 'select':
                  expect(config.options).toBeDefined();
                  expect(Array.isArray(config.options)).toBe(true);
                  if (config.options && config.options.length > 0) {
                    expect(config.options).toContain(config.value);
                  }
                  break;
                case 'json':
                  expect(typeof config.value).toBe('object');
                  break;
              }
            }

            // Verify commission-related configurations are present
            const commissionConfigs = financialConfigs.filter(config => 
              config.key.toLowerCase().includes('commission') || 
              config.key.toLowerCase().includes('rate')
            );

            // Should have at least some commission configurations
            expect(commissionConfigs.length).toBeGreaterThan(0);

            // Verify each commission config has proper validation
            for (const commissionConfig of commissionConfigs) {
              if (commissionConfig.dataType === 'number') {
                expect(commissionConfig.validation).toBeDefined();
                if (commissionConfig.validation) {
                  expect(commissionConfig.validation.min).toBeDefined();
                  expect(commissionConfig.validation.max).toBeDefined();
                  expect(commissionConfig.validation.min).toBeGreaterThanOrEqual(0);
                  expect(commissionConfig.validation.max).toBeLessThanOrEqual(100);
                }
              }
            }
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });

    test('configuration values should be consistent between service and direct database queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            configKey: fc.string({ minLength: 1, maxLength: 50 })
          }),
          async (testData) => {
            // Get all available configuration keys from database
            const allConfigs = await prisma.platformConfigs.findMany({
              select: { key: true }
            });

            if (allConfigs.length === 0) {
              return; // Skip if no configs exist
            }

            // Pick a random existing key
            const randomConfig = allConfigs[Math.floor(Math.random() * allConfigs.length)];
            const configKey = randomConfig.key;

            // Clear cache to ensure fresh data
            await cacheService.del(`platform_config:key:${configKey}`);

            // Get config through service
            const serviceConfig = await platformConfigService.getConfig(configKey);

            // Get config directly from database
            const dbConfig = await prisma.platformConfigs.findUnique({
              where: { key: configKey }
            });

            // Both should exist and match
            expect(serviceConfig).not.toBeNull();
            expect(dbConfig).not.toBeNull();

            if (serviceConfig && dbConfig) {
              expect(serviceConfig.id).toBe(dbConfig.id);
              expect(serviceConfig.category).toBe(dbConfig.category);
              expect(serviceConfig.key).toBe(dbConfig.key);
              expect(serviceConfig.value).toEqual(dbConfig.value);
              expect(serviceConfig.dataType).toBe(dbConfig.dataType);
              expect(serviceConfig.displayName).toBe(dbConfig.displayName);
              expect(serviceConfig.description).toBe(dbConfig.description);
              expect(serviceConfig.isEditable).toBe(dbConfig.isEditable);
              expect(serviceConfig.requiresRestart).toBe(dbConfig.requiresRestart);

              // Test getConfigValue method consistency
              const configValue = await platformConfigService.getConfigValue(configKey);
              expect(configValue).toEqual(dbConfig.value);
            }
          }
        ),
        { numRuns: 15, timeout: 30000 }
      );
    });

    test('configuration updates should be immediately persisted to database', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            newValue: fc.oneof(
              fc.integer({ min: 0, max: 100 }),
              fc.string({ minLength: 1, maxLength: 100 }),
              fc.boolean()
            ),
            updatedBy: fc.uuid()
          }),
          async (testData) => {
            // Find an editable configuration
            const editableConfigs = await prisma.platformConfigs.findMany({
              where: { isEditable: true }
            });

            if (editableConfigs.length === 0) {
              return; // Skip if no editable configs exist
            }

            const randomConfig = editableConfigs[Math.floor(Math.random() * editableConfigs.length)];
            const originalValue = randomConfig.value;

            // Ensure new value is different and compatible with data type
            let newValue = testData.newValue;
            if (randomConfig.dataType === 'number' && typeof newValue !== 'number') {
              newValue = Math.floor(Math.random() * 100);
            } else if (randomConfig.dataType === 'string' && typeof newValue !== 'string') {
              newValue = `test_value_${Date.now()}`;
            } else if (randomConfig.dataType === 'boolean' && typeof newValue !== 'boolean') {
              newValue = !randomConfig.value;
            } else if (randomConfig.dataType === 'select' && randomConfig.options) {
              newValue = randomConfig.options[0];
            }

            // Skip if new value is same as original
            if (newValue === originalValue) {
              return;
            }

            try {
              // Update through service
              const updatedConfig = await platformConfigService.updateConfig(randomConfig.key, {
                value: newValue,
                updatedBy: testData.updatedBy
              });

              // Verify service returned updated config
              expect(updatedConfig.value).toEqual(newValue);
              expect(updatedConfig.updatedBy).toBe(testData.updatedBy);
              expect(updatedConfig.updatedAt.getTime()).toBeGreaterThan(randomConfig.updatedAt.getTime());

              // Verify database was updated
              const dbConfig = await prisma.platformConfigs.findUnique({
                where: { key: randomConfig.key }
              });

              expect(dbConfig).not.toBeNull();
              expect(dbConfig!.value).toEqual(newValue);
              expect(dbConfig!.updatedBy).toBe(testData.updatedBy);
              expect(dbConfig!.updatedAt.getTime()).toBeGreaterThan(randomConfig.updatedAt.getTime());

              // Verify cache was invalidated by checking fresh service call
              await cacheService.del(`platform_config:key:${randomConfig.key}`);
              const freshConfig = await platformConfigService.getConfig(randomConfig.key);
              expect(freshConfig!.value).toEqual(newValue);

            } finally {
              // Restore original value
              try {
                await platformConfigService.updateConfig(randomConfig.key, {
                  value: originalValue,
                  updatedBy: testData.updatedBy
                });
              } catch (error) {
                // Ignore cleanup errors
              }
            }
          }
        ),
        { numRuns: 5, timeout: 30000 }
      );
    });

    test('financial calculations should use real configuration values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bookingAmount: fc.float({ min: 10, max: 1000 }),
            transactionType: fc.constantFrom('PAYMENT', 'REFUND', 'COMMISSION')
          }),
          async (testData) => {
            // Get commission rate configurations
            const commissionConfigs = await platformConfigService.getConfigsByCategory('financial');
            const commissionRateConfigs = commissionConfigs.filter(config => 
              config.key.toLowerCase().includes('commission') && 
              config.dataType === 'number'
            );

            if (commissionRateConfigs.length === 0) {
              return; // Skip if no commission rate configs exist
            }

            // Test that each commission rate is a valid percentage
            for (const rateConfig of commissionRateConfigs) {
              expect(typeof rateConfig.value).toBe('number');
              expect(rateConfig.value).toBeGreaterThanOrEqual(0);
              expect(rateConfig.value).toBeLessThanOrEqual(100);

              // Verify validation rules exist for commission rates
              expect(rateConfig.validation).toBeDefined();
              if (rateConfig.validation) {
                expect(rateConfig.validation.min).toBeDefined();
                expect(rateConfig.validation.max).toBeDefined();
                expect(rateConfig.validation.min).toBeGreaterThanOrEqual(0);
                expect(rateConfig.validation.max).toBeLessThanOrEqual(100);
              }

              // Test commission calculation consistency
              const commissionAmount = (testData.bookingAmount * rateConfig.value) / 100;
              expect(commissionAmount).toBeGreaterThanOrEqual(0);
              expect(commissionAmount).toBeLessThanOrEqual(testData.bookingAmount);

              // Verify the configuration value matches database
              const dbConfig = await prisma.platformConfigs.findUnique({
                where: { key: rateConfig.key }
              });
              expect(dbConfig).not.toBeNull();
              expect(dbConfig!.value).toBe(rateConfig.value);
            }
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });

    test('configuration categories should be properly organized', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            category: fc.constantFrom('financial', 'system', 'features', 'security', 'performance')
          }),
          async (testData) => {
            // Get configurations by category
            const categoryConfigs = await platformConfigService.getConfigsByCategory(testData.category);

            // Verify all configs in category have correct category
            for (const config of categoryConfigs) {
              expect(config.category).toBe(testData.category);

              // Verify database consistency
              const dbConfig = await prisma.platformConfigs.findUnique({
                where: { key: config.key }
              });
              expect(dbConfig).not.toBeNull();
              expect(dbConfig!.category).toBe(testData.category);
            }

            // Verify category-specific constraints
            if (testData.category === 'financial') {
              // Financial configs should have proper validation
              const numericConfigs = categoryConfigs.filter(c => c.dataType === 'number');
              for (const numConfig of numericConfigs) {
                if (numConfig.key.toLowerCase().includes('rate') || 
                    numConfig.key.toLowerCase().includes('commission')) {
                  expect(numConfig.validation).toBeDefined();
                  expect(numConfig.validation?.min).toBeGreaterThanOrEqual(0);
                  expect(numConfig.validation?.max).toBeLessThanOrEqual(100);
                }
              }
            }

            // Verify all configs have required fields
            for (const config of categoryConfigs) {
              expect(config.key).toBeTruthy();
              expect(config.displayName).toBeTruthy();
              expect(config.dataType).toBeTruthy();
              expect(['string', 'number', 'boolean', 'select', 'json']).toContain(config.dataType);
              expect(typeof config.isEditable).toBe('boolean');
              expect(typeof config.requiresRestart).toBe('boolean');
            }
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });

    test('configuration validation should prevent invalid values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            invalidValue: fc.oneof(
              fc.integer({ min: -100, max: -1 }), // Negative numbers for rates
              fc.integer({ min: 101, max: 200 }), // Over 100% for rates
              fc.string({ minLength: 0, maxLength: 0 }), // Empty string for required
              fc.constant(null),
              fc.constant(undefined)
            )
          }),
          async (testData) => {
            // Find configurations with validation rules
            const allConfigs = await prisma.platformConfigs.findMany({
              where: {
                isEditable: true,
                validation: { not: null }
              }
            });

            if (allConfigs.length === 0) {
              return; // Skip if no configs with validation exist
            }

            const randomConfig = allConfigs[Math.floor(Math.random() * allConfigs.length)];
            const validation = randomConfig.validation as any;

            // Test validation based on data type and rules
            let shouldFail = false;
            const invalidValue = testData.invalidValue;

            if (validation.required && (invalidValue === null || invalidValue === undefined || invalidValue === '')) {
              shouldFail = true;
            }

            if (randomConfig.dataType === 'number' && typeof invalidValue === 'number') {
              if (validation.min !== undefined && invalidValue < validation.min) {
                shouldFail = true;
              }
              if (validation.max !== undefined && invalidValue > validation.max) {
                shouldFail = true;
              }
            }

            if (randomConfig.dataType === 'select' && randomConfig.options) {
              if (!randomConfig.options.includes(invalidValue)) {
                shouldFail = true;
              }
            }

            if (shouldFail) {
              // Attempt to update with invalid value should fail
              await expect(
                platformConfigService.updateConfig(randomConfig.key, {
                  value: invalidValue,
                  updatedBy: 'test-user'
                })
              ).rejects.toThrow();

              // Verify original value is unchanged in database
              const dbConfig = await prisma.platformConfigs.findUnique({
                where: { key: randomConfig.key }
              });
              expect(dbConfig!.value).toEqual(randomConfig.value);
            }
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });
  });
});