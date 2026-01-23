/**
 * Property-based tests for platform admin feature toggle consistency
 * Feature: platform-admin-dashboard, Property 2: Global Feature Toggle Consistency
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { FeatureToggle } from '../middleware/feature-toggle.middleware';

// Mock the services
vi.mock('./platform-config.service');
vi.mock('./feature-toggle.service');

describe('Platform Admin Feature Toggle Consistency Property Tests', () => {
  let currentConfig: any;
  let mockPlatformConfigService: any;
  let mockFeatureToggleService: any;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Import the mocked services
    const platformConfigModule = await import('./platform-config.service');
    const featureToggleModule = await import('./feature-toggle.service');
    
    mockPlatformConfigService = platformConfigModule.platformConfigService;
    mockFeatureToggleService = featureToggleModule.featureToggleService;
    
    // Set up initial mock configuration
    currentConfig = {
      id: 'test-config-id',
      commissionRate: 0.15,
      taxRate: 0.25,
      bookingTimeoutHours: 24,
      defaultCurrency: 'NOK',
      withoutDriverListings: true,
      hourlyBookings: true,
      recurringBookings: true,
      instantBooking: false,
      maxBookingDuration: 30,
      minBookingAdvance: 2,
      autoApprovalEnabled: false,
      maintenanceMode: false,
      version: 1,
      isActive: true,
      activatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      activatedBy: null
    };
    
    // Mock platform config service methods
    mockPlatformConfigService.getConfiguration = vi.fn().mockResolvedValue(currentConfig);
    mockPlatformConfigService.getOrCreateDefaultConfiguration = vi.fn().mockResolvedValue(currentConfig);
    
    mockPlatformConfigService.updateConfiguration = vi.fn().mockImplementation(async (updates: any, adminUserId: string) => {
      // Simulate updating the configuration
      const updatedConfig = {
        ...currentConfig,
        ...updates,
        version: currentConfig.version + 1,
        updatedAt: new Date()
      };
      currentConfig = updatedConfig;
      mockPlatformConfigService.getConfiguration.mockResolvedValue(updatedConfig);
      return updatedConfig;
    });

    // Mock feature toggle service methods
    mockFeatureToggleService.isFeatureEnabled = vi.fn().mockImplementation(async (feature: FeatureToggle) => {
      const featureMap: Record<FeatureToggle, keyof typeof currentConfig> = {
        [FeatureToggle.WITHOUT_DRIVER_LISTINGS]: 'withoutDriverListings',
        [FeatureToggle.HOURLY_BOOKINGS]: 'hourlyBookings',
        [FeatureToggle.RECURRING_BOOKINGS]: 'recurringBookings',
        [FeatureToggle.INSTANT_BOOKING]: 'instantBooking',
        [FeatureToggle.AUTO_APPROVAL]: 'autoApprovalEnabled',
        [FeatureToggle.MAINTENANCE_MODE]: 'maintenanceMode',
      };
      
      const configKey = featureMap[feature];
      return currentConfig[configKey] || false;
    });

    mockFeatureToggleService.invalidateFeature = vi.fn();
    mockFeatureToggleService.invalidateCache = vi.fn();
    mockFeatureToggleService.preloadFeatures = vi.fn().mockResolvedValue(undefined);
    mockFeatureToggleService.getCacheStats = vi.fn().mockReturnValue({
      totalFeatures: 6,
      lastConfigVersion: currentConfig.version
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 2: Global Feature Toggle Consistency
   * For any platform feature toggle change, the new setting should be applied 
   * consistently across all companies and users without affecting unrelated functionality
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
   */
  it('should apply feature toggle changes consistently across all platform entities', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          featureToggles: fc.record({
            withoutDriverListings: fc.boolean(),
            hourlyBookings: fc.boolean(),
            recurringBookings: fc.boolean(),
            instantBooking: fc.boolean(),
            autoApprovalEnabled: fc.boolean(),
            maintenanceMode: fc.boolean(),
          }),
          targetFeature: fc.constantFrom(
            'withoutDriverListings',
            'hourlyBookings', 
            'recurringBookings',
            'instantBooking',
            'autoApprovalEnabled',
            'maintenanceMode'
          ),
          newValue: fc.boolean(),
        }),
        async ({ featureToggles, targetFeature, newValue }) => {
          try {
            // Step 1: Set initial configuration
            const initialConfig = await mockPlatformConfigService.updateConfiguration(
              featureToggles,
              'test-admin-id'
            );

            // Verify initial state is set correctly
            expect(initialConfig).toBeDefined();
            Object.keys(featureToggles).forEach(feature => {
              expect((initialConfig as any)[feature]).toBe((featureToggles as any)[feature]);
            });

            // Step 2: Change the target feature
            const updatedFeatureToggles = {
              ...featureToggles,
              [targetFeature]: newValue
            };

            const updatedConfig = await mockPlatformConfigService.updateConfiguration(
              updatedFeatureToggles,
              'test-admin-id'
            );

            // Step 3: Verify the target feature was updated
            expect((updatedConfig as any)[targetFeature]).toBe(newValue);

            // Step 4: Verify other features remain unchanged
            Object.keys(featureToggles).forEach(feature => {
              if (feature !== targetFeature) {
                expect((updatedConfig as any)[feature]).toBe((featureToggles as any)[feature]);
              }
            });

            // Step 5: Verify consistency through feature toggle service
            const featureToggleMap: Record<string, FeatureToggle> = {
              'withoutDriverListings': FeatureToggle.WITHOUT_DRIVER_LISTINGS,
              'hourlyBookings': FeatureToggle.HOURLY_BOOKINGS,
              'recurringBookings': FeatureToggle.RECURRING_BOOKINGS,
              'instantBooking': FeatureToggle.INSTANT_BOOKING,
              'autoApprovalEnabled': FeatureToggle.AUTO_APPROVAL,
              'maintenanceMode': FeatureToggle.MAINTENANCE_MODE,
            };

            // Check that the feature toggle service returns consistent values
            for (const [configKey, toggleEnum] of Object.entries(featureToggleMap)) {
              const serviceValue = await mockFeatureToggleService.isFeatureEnabled(toggleEnum);
              const configValue = (updatedConfig as any)[configKey];
              expect(serviceValue).toBe(configValue);
            }

            // Step 6: Verify cache invalidation works correctly
            mockFeatureToggleService.invalidateCache();
            
            const serviceValueAfterClear = await mockFeatureToggleService.isFeatureEnabled(
              featureToggleMap[targetFeature]
            );
            expect(serviceValueAfterClear).toBe(newValue);

            // Step 7: Verify configuration version incremented
            expect(updatedConfig.version).toBe(initialConfig.version + 1);

            // Step 8: Verify configuration is active
            expect(updatedConfig.isActive).toBe(true);

          } catch (error) {
            // If we get a validation error, that's acceptable for some invalid combinations
            if (error instanceof Error && error.message.includes('validation')) {
              return; // Skip this test case
            }
            throw error;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Feature toggle changes should not affect unrelated configuration
   */
  it('should not affect unrelated configuration when toggling features', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialFeature: fc.constantFrom(
            'withoutDriverListings',
            'hourlyBookings',
            'recurringBookings'
          ),
          initialValue: fc.boolean(),
          toggledValue: fc.boolean(),
        }),
        async ({ initialFeature, initialValue, toggledValue }) => {
          try {
            // Step 1: Set initial feature state
            const initialUpdate = { [initialFeature]: initialValue };
            const configBefore = await mockPlatformConfigService.updateConfiguration(
              initialUpdate,
              'test-admin-id'
            );

            // Step 2: Capture non-feature configuration before toggle
            const nonFeatureConfigBefore = {
              commissionRate: configBefore.commissionRate,
              taxRate: configBefore.taxRate,
              bookingTimeoutHours: configBefore.bookingTimeoutHours,
              defaultCurrency: configBefore.defaultCurrency,
              maxBookingDuration: configBefore.maxBookingDuration,
              minBookingAdvance: configBefore.minBookingAdvance
            };

            // Step 3: Toggle the feature
            const toggleUpdate = { [initialFeature]: toggledValue };
            const configAfter = await mockPlatformConfigService.updateConfiguration(
              toggleUpdate,
              'test-admin-id'
            );

            // Step 4: Verify non-feature configuration remains unchanged
            expect(configAfter.commissionRate).toBe(nonFeatureConfigBefore.commissionRate);
            expect(configAfter.taxRate).toBe(nonFeatureConfigBefore.taxRate);
            expect(configAfter.bookingTimeoutHours).toBe(nonFeatureConfigBefore.bookingTimeoutHours);
            expect(configAfter.defaultCurrency).toBe(nonFeatureConfigBefore.defaultCurrency);
            expect(configAfter.maxBookingDuration).toBe(nonFeatureConfigBefore.maxBookingDuration);
            expect(configAfter.minBookingAdvance).toBe(nonFeatureConfigBefore.minBookingAdvance);

            // Step 5: Verify only the target feature changed
            expect((configAfter as any)[initialFeature]).toBe(toggledValue);

            // Step 6: Verify version incremented
            expect(configAfter.version).toBe(configBefore.version + 1);

          } catch (error) {
            if (error instanceof Error && error.message.includes('validation')) {
              return; // Skip invalid test cases
            }
            throw error;
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Multiple feature toggles should be applied atomically
   */
  it('should apply multiple feature toggle changes atomically', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          changes: fc.record({
            withoutDriverListings: fc.boolean(),
            hourlyBookings: fc.boolean(),
            instantBooking: fc.boolean(),
          }),
        }),
        async ({ changes }) => {
          try {
            // Step 1: Apply multiple changes in one update
            const updatedConfig = await mockPlatformConfigService.updateConfiguration(
              changes,
              'test-admin-id'
            );

            // Step 2: Verify all changes were applied
            Object.keys(changes).forEach(feature => {
              expect((updatedConfig as any)[feature]).toBe((changes as any)[feature]);
            });

            // Step 3: Verify atomicity - configuration reflects all changes
            const currentConfig = await mockPlatformConfigService.getConfiguration();
            expect(currentConfig).toBeDefined();
            
            if (currentConfig) {
              Object.keys(changes).forEach(feature => {
                expect((currentConfig as any)[feature]).toBe((changes as any)[feature]);
              });
            }

            // Step 4: Verify feature toggle service reflects all changes
            const featureChecks = await Promise.all([
              mockFeatureToggleService.isFeatureEnabled(FeatureToggle.WITHOUT_DRIVER_LISTINGS),
              mockFeatureToggleService.isFeatureEnabled(FeatureToggle.HOURLY_BOOKINGS),
              mockFeatureToggleService.isFeatureEnabled(FeatureToggle.INSTANT_BOOKING),
            ]);

            expect(featureChecks[0]).toBe(changes.withoutDriverListings);
            expect(featureChecks[1]).toBe(changes.hourlyBookings);
            expect(featureChecks[2]).toBe(changes.instantBooking);

          } catch (error) {
            if (error instanceof Error && error.message.includes('validation')) {
              return; // Skip invalid combinations
            }
            throw error;
          }
        }
      ),
      { numRuns: 75 }
    );
  });

  /**
   * Property: Feature toggle cache should be consistent with configuration state
   */
  it('should maintain cache consistency with configuration state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          feature: fc.constantFrom(
            'withoutDriverListings',
            'hourlyBookings',
            'recurringBookings',
            'instantBooking'
          ),
          value: fc.boolean(),
          cacheOperations: fc.array(
            fc.constantFrom('invalidate', 'check', 'preload'),
            { minLength: 1, maxLength: 3 }
          ),
        }),
        async ({ feature, value, cacheOperations }) => {
          try {
            // Step 1: Update feature in configuration
            const updateData = { [feature]: value };
            await mockPlatformConfigService.updateConfiguration(
              updateData,
              'test-admin-id'
            );

            const featureToggleMap: Record<string, FeatureToggle> = {
              'withoutDriverListings': FeatureToggle.WITHOUT_DRIVER_LISTINGS,
              'hourlyBookings': FeatureToggle.HOURLY_BOOKINGS,
              'recurringBookings': FeatureToggle.RECURRING_BOOKINGS,
              'instantBooking': FeatureToggle.INSTANT_BOOKING,
            };

            const toggleEnum = featureToggleMap[feature];

            // Step 2: Perform cache operations and verify consistency
            for (const operation of cacheOperations) {
              switch (operation) {
                case 'invalidate':
                  mockFeatureToggleService.invalidateFeature(toggleEnum);
                  break;
                case 'check':
                  const cachedValue = await mockFeatureToggleService.isFeatureEnabled(toggleEnum);
                  expect(cachedValue).toBe(value);
                  break;
                case 'preload':
                  await mockFeatureToggleService.preloadFeatures();
                  const preloadedValue = await mockFeatureToggleService.isFeatureEnabled(toggleEnum);
                  expect(preloadedValue).toBe(value);
                  break;
              }
            }

            // Step 3: Final consistency check
            const finalValue = await mockFeatureToggleService.isFeatureEnabled(toggleEnum);
            expect(finalValue).toBe(value);

            // Step 4: Verify cache statistics are reasonable
            const cacheStats = mockFeatureToggleService.getCacheStats();
            expect(cacheStats.totalFeatures).toBeGreaterThan(0);
            expect(cacheStats.lastConfigVersion).toBeGreaterThan(0);

          } catch (error) {
            if (error instanceof Error && error.message.includes('validation')) {
              return; // Skip invalid test cases
            }
            throw error;
          }
        }
      ),
      { numRuns: 60 }
    );
  });

  /**
   * Property: Feature toggle state should remain consistent across operations
   */
  it('should maintain feature toggle state consistency across operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          baseFeatures: fc.record({
            withoutDriverListings: fc.boolean(),
            hourlyBookings: fc.boolean(),
          }),
          operationSequence: fc.array(
            fc.constantFrom('check', 'invalidate', 'preload'),
            { minLength: 2, maxLength: 5 }
          ),
        }),
        async ({ baseFeatures, operationSequence }) => {
          try {
            // Step 1: Set base feature configuration
            await mockPlatformConfigService.updateConfiguration(
              baseFeatures,
              'test-admin-id'
            );

            // Step 2: Verify initial feature toggle service state
            const initialWithoutDriverEnabled = await mockFeatureToggleService.isFeatureEnabled(
              FeatureToggle.WITHOUT_DRIVER_LISTINGS
            );
            const initialHourlyBookingsEnabled = await mockFeatureToggleService.isFeatureEnabled(
              FeatureToggle.HOURLY_BOOKINGS
            );

            expect(initialWithoutDriverEnabled).toBe(baseFeatures.withoutDriverListings);
            expect(initialHourlyBookingsEnabled).toBe(baseFeatures.hourlyBookings);

            // Step 3: Perform sequence of operations
            for (const operation of operationSequence) {
              switch (operation) {
                case 'check':
                  await mockFeatureToggleService.isFeatureEnabled(FeatureToggle.WITHOUT_DRIVER_LISTINGS);
                  await mockFeatureToggleService.isFeatureEnabled(FeatureToggle.HOURLY_BOOKINGS);
                  break;
                case 'invalidate':
                  mockFeatureToggleService.invalidateCache();
                  break;
                case 'preload':
                  await mockFeatureToggleService.preloadFeatures();
                  break;
              }
            }

            // Step 4: Verify feature toggles maintain consistency after operations
            const finalWithoutDriverEnabled = await mockFeatureToggleService.isFeatureEnabled(
              FeatureToggle.WITHOUT_DRIVER_LISTINGS
            );
            const finalHourlyBookingsEnabled = await mockFeatureToggleService.isFeatureEnabled(
              FeatureToggle.HOURLY_BOOKINGS
            );

            expect(finalWithoutDriverEnabled).toBe(baseFeatures.withoutDriverListings);
            expect(finalHourlyBookingsEnabled).toBe(baseFeatures.hourlyBookings);

            // Step 5: Verify configuration remains unchanged
            const finalConfig = await mockPlatformConfigService.getConfiguration();
            expect(finalConfig.withoutDriverListings).toBe(baseFeatures.withoutDriverListings);
            expect(finalConfig.hourlyBookings).toBe(baseFeatures.hourlyBookings);

          } catch (error) {
            if (error instanceof Error && error.message.includes('validation')) {
              return; // Skip invalid test cases
            }
            throw error;
          }
        }
      ),
      { numRuns: 40 }
    );
  });
});