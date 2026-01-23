import { VehicleType, FuelType, ListingStatus, VehicleListing, DriverListing } from '@prisma/client';
import { SearchFilters, SearchResult } from '../services/listing.service';
import { listingService } from '../services/listing.service';

/**
 * Search testing utilities for generating various search filter combinations
 * and verifying search result correctness
 */

export interface SearchTestScenario {
  name: string;
  description: string;
  filters: SearchFilters;
  expectedBehavior: {
    shouldReturnResults?: boolean;
    minimumResults?: number;
    maximumResults?: number;
    shouldIncludeVehicles?: boolean;
    shouldIncludeDrivers?: boolean;
    resultValidation?: (result: SearchResult) => boolean;
  };
}

/**
 * Generate comprehensive search filter combinations for testing
 */
export function generateSearchFilterCombinations(): SearchFilters[] {
  const combinations: SearchFilters[] = [];

  // Basic search scenarios
  combinations.push({});  // Empty filters (should return all active listings)
  
  // Listing type filters
  combinations.push({ listingType: 'vehicle' });
  combinations.push({ listingType: 'driver' });
  combinations.push({ listingType: 'vehicle_driver' });

  // Location filters
  const locations = [
    { fylke: 'Oslo' },
    { kommune: 'Bergen' },
    { fylke: 'Vestland', kommune: 'Bergen' },
    { fylke: 'Oslo', radius: 50, coordinates: [10.7522, 59.9139] as [number, number] },
  ];
  locations.forEach(location => {
    combinations.push({ location });
  });

  // Vehicle type filters
  const vehicleTypes = Object.values(VehicleType);
  vehicleTypes.forEach(vehicleType => {
    combinations.push({ vehicleType: [vehicleType] });
  });
  combinations.push({ vehicleType: [VehicleType.PALLET_8, VehicleType.PALLET_18] });

  // Fuel type filters
  const fuelTypes = Object.values(FuelType);
  fuelTypes.forEach(fuelType => {
    combinations.push({ fuelType: [fuelType] });
  });
  combinations.push({ fuelType: [FuelType.ELECTRIC, FuelType.BIOGAS] });

  // Capacity filters
  combinations.push({ capacity: { min: 2 } });
  combinations.push({ capacity: { max: 8 } });
  combinations.push({ capacity: { min: 4, max: 10 } });

  // Price range filters
  combinations.push({ priceRange: { min: 100 } });
  combinations.push({ priceRange: { max: 500 } });
  combinations.push({ priceRange: { min: 200, max: 400 } });

  // Date range filters
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  combinations.push({
    dateRange: {
      start: tomorrow,
      end: nextWeek,
    },
  });

  // With/without driver filters
  combinations.push({ withDriver: true });
  combinations.push({ withDriver: false });

  // Tags filters
  combinations.push({ tags: ['eco-friendly'] });
  combinations.push({ tags: ['commercial', 'cargo'] });

  // Pagination and sorting
  combinations.push({ page: 1, pageSize: 10 });
  combinations.push({ page: 2, pageSize: 5 });
  combinations.push({ sortBy: 'price', sortOrder: 'asc' });
  combinations.push({ sortBy: 'rating', sortOrder: 'desc' });

  // Complex combinations
  combinations.push({
    listingType: 'vehicle',
    location: { fylke: 'Oslo' },
    vehicleType: [VehicleType.PALLET_8, VehicleType.PALLET_18],
    priceRange: { min: 100, max: 300 },
    withDriver: false,
    sortBy: 'price',
    sortOrder: 'asc',
  });

  combinations.push({
    listingType: 'driver',
    location: { kommune: 'Bergen' },
    priceRange: { max: 400 },
    sortBy: 'rating',
    sortOrder: 'desc',
  });

  return combinations;
}

/**
 * Generate edge case search scenarios for testing
 */
export function generateEdgeCaseSearchScenarios(): SearchTestScenario[] {
  return [
    {
      name: 'Non-existent Location',
      description: 'Search for location that does not exist in database',
      filters: {
        location: { fylke: 'NonExistentFylke', kommune: 'NonExistentKommune' },
      },
      expectedBehavior: {
        shouldReturnResults: false,
        minimumResults: 0,
        maximumResults: 0,
      },
    },
    {
      name: 'Impossible Price Range',
      description: 'Search with price range that no listings can match',
      filters: {
        priceRange: { min: 10000, max: 20000 }, // Extremely high prices
      },
      expectedBehavior: {
        shouldReturnResults: false,
        minimumResults: 0,
        maximumResults: 0,
      },
    },
    {
      name: 'Extremely Large Capacity',
      description: 'Search for capacity that exceeds any vehicle',
      filters: {
        listingType: 'vehicle', // Only search vehicles for capacity filter
        capacity: { min: 1000 }, // Impossible capacity
      },
      expectedBehavior: {
        shouldReturnResults: false,
        minimumResults: 0,
        maximumResults: 0,
      },
    },
    {
      name: 'Non-existent Tags',
      description: 'Search for tags that do not exist on any listing',
      filters: {
        listingType: 'vehicle', // Only search vehicles for tags filter
        tags: ['non-existent-tag', 'impossible-feature'],
      },
      expectedBehavior: {
        shouldReturnResults: false,
        minimumResults: 0,
        maximumResults: 0,
      },
    },
    {
      name: 'Large Page Number',
      description: 'Search with page number beyond available results',
      filters: {
        page: 1000,
        pageSize: 10,
      },
      expectedBehavior: {
        shouldReturnResults: false,
        minimumResults: 0,
        maximumResults: 0,
      },
    },
    {
      name: 'Zero Page Size',
      description: 'Search with zero page size should default to reasonable size',
      filters: {
        pageSize: 0,
      },
      expectedBehavior: {
        shouldReturnResults: true, // Should default to reasonable page size
        minimumResults: 1, // Should have some results
      },
    },
    {
      name: 'Past Date Range',
      description: 'Search with date range in the past should still return results if no conflicts',
      filters: {
        dateRange: {
          start: new Date('2020-01-01'),
          end: new Date('2020-01-02'),
        },
      },
      expectedBehavior: {
        shouldReturnResults: true, // Past dates should work if no booking conflicts
        minimumResults: 1,
      },
    },
    {
      name: 'Restrictive Vehicle Filter Combination',
      description: 'Search with very restrictive filters that should return no results',
      filters: {
        listingType: 'vehicle',
        location: { fylke: 'NonExistentFylke' },
        vehicleType: [VehicleType.TRAILER], // Type that may not exist
        priceRange: { min: 1, max: 10 }, // Very low price range
      },
      expectedBehavior: {
        shouldReturnResults: false,
        minimumResults: 0,
        maximumResults: 0,
      },
    },
  ];
}

/**
 * Verify that search results match the specified filter criteria
 */
export function verifySearchResultsMatchFilters(
  results: SearchResult,
  filters: SearchFilters
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verify listing type filter
  if (filters.listingType) {
    if (filters.listingType === 'vehicle' && results.driverListings.length > 0) {
      errors.push('Vehicle-only search returned driver listings');
    }
    if (filters.listingType === 'driver' && results.vehicleListings.length > 0) {
      errors.push('Driver-only search returned vehicle listings');
    }
  }

  // Verify vehicle type filter
  if (filters.vehicleType && filters.vehicleType.length > 0) {
    for (const listing of results.vehicleListings) {
      if (!filters.vehicleType.includes(listing.vehicleType)) {
        errors.push(`Vehicle listing ${listing.id} has type ${listing.vehicleType} not in filter ${filters.vehicleType.join(', ')}`);
      }
    }
  }

  // Verify fuel type filter
  if (filters.fuelType && filters.fuelType.length > 0) {
    for (const listing of results.vehicleListings) {
      if (!filters.fuelType.includes(listing.fuelType)) {
        errors.push(`Vehicle listing ${listing.id} has fuel type ${listing.fuelType} not in filter ${filters.fuelType.join(', ')}`);
      }
    }
  }

  // Verify capacity filter
  if (filters.capacity) {
    for (const listing of results.vehicleListings) {
      if (filters.capacity.min !== undefined && listing.capacity < filters.capacity.min) {
        errors.push(`Vehicle listing ${listing.id} has capacity ${listing.capacity} below minimum ${filters.capacity.min}`);
      }
      if (filters.capacity.max !== undefined && listing.capacity > filters.capacity.max) {
        errors.push(`Vehicle listing ${listing.id} has capacity ${listing.capacity} above maximum ${filters.capacity.max}`);
      }
    }
  }

  // Verify price range filter
  if (filters.priceRange) {
    for (const listing of results.vehicleListings) {
      const rates = [listing.hourlyRate, listing.dailyRate].filter(rate => rate !== null && rate !== undefined);
      if (rates.length === 0) continue; // Skip listings without rates
      
      const hasRateInRange = rates.some(rate => {
        const rateValue = rate as number;
        const aboveMin = filters.priceRange!.min === undefined || rateValue >= filters.priceRange!.min;
        const belowMax = filters.priceRange!.max === undefined || rateValue <= filters.priceRange!.max;
        return aboveMin && belowMax;
      });
      
      if (!hasRateInRange) {
        errors.push(`Vehicle listing ${listing.id} has no rates in range ${filters.priceRange.min}-${filters.priceRange.max}`);
      }
    }

    for (const listing of results.driverListings) {
      const rates = [listing.hourlyRate, listing.dailyRate].filter(rate => rate !== null && rate !== undefined);
      if (rates.length === 0) continue; // Skip listings without rates
      
      const hasRateInRange = rates.some(rate => {
        const rateValue = rate as number;
        const aboveMin = filters.priceRange!.min === undefined || rateValue >= filters.priceRange!.min;
        const belowMax = filters.priceRange!.max === undefined || rateValue <= filters.priceRange!.max;
        return aboveMin && belowMax;
      });
      
      if (!hasRateInRange) {
        errors.push(`Driver listing ${listing.id} has no rates in range ${filters.priceRange.min}-${filters.priceRange.max}`);
      }
    }
  }

  // Verify with/without driver filter
  if (filters.withDriver !== undefined) {
    for (const listing of results.vehicleListings) {
      if (filters.withDriver && !listing.withDriver) {
        errors.push(`Vehicle listing ${listing.id} does not offer with-driver service but filter requires it`);
      }
      if (!filters.withDriver && !listing.withoutDriver) {
        errors.push(`Vehicle listing ${listing.id} does not offer without-driver service but filter requires it`);
      }
    }
  }

  // Verify tags filter
  if (filters.tags && filters.tags.length > 0) {
    for (const listing of results.vehicleListings) {
      const listingTags = listing.tags || [];
      const hasAllTags = filters.tags.every(tag => listingTags.includes(tag));
      if (!hasAllTags) {
        errors.push(`Vehicle listing ${listing.id} does not have all required tags: ${filters.tags.join(', ')}`);
      }
    }
  }

  // Verify pagination
  if (filters.page && filters.pageSize) {
    const expectedMaxResults = filters.pageSize;
    const totalResults = results.vehicleListings.length + results.driverListings.length;
    if (totalResults > expectedMaxResults) {
      errors.push(`Page size ${filters.pageSize} exceeded: got ${totalResults} results`);
    }
  }

  // Verify all results are active
  for (const listing of results.vehicleListings) {
    if (listing.status !== ListingStatus.ACTIVE) {
      errors.push(`Vehicle listing ${listing.id} has status ${listing.status}, expected ACTIVE`);
    }
  }

  for (const listing of results.driverListings) {
    if (listing.status !== ListingStatus.ACTIVE) {
      errors.push(`Driver listing ${listing.id} has status ${listing.status}, expected ACTIVE`);
    }
    if (!listing.verified) {
      errors.push(`Driver listing ${listing.id} is not verified but was returned in search results`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Verify that search results contain all required fields
 */
export function verifySearchResultsCompleteness(results: SearchResult): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check vehicle listings completeness
  for (const listing of results.vehicleListings) {
    if (!listing.id) errors.push(`Vehicle listing missing id`);
    if (!listing.title) errors.push(`Vehicle listing ${listing.id} missing title`);
    if (!listing.description) errors.push(`Vehicle listing ${listing.id} missing description`);
    if (!listing.vehicleType) errors.push(`Vehicle listing ${listing.id} missing vehicleType`);
    if (!listing.capacity) errors.push(`Vehicle listing ${listing.id} missing capacity`);
    if (!listing.fuelType) errors.push(`Vehicle listing ${listing.id} missing fuelType`);
    if (!listing.city) errors.push(`Vehicle listing ${listing.id} missing city`);
    if (!listing.fylke) errors.push(`Vehicle listing ${listing.id} missing fylke`);
    if (!listing.kommune) errors.push(`Vehicle listing ${listing.id} missing kommune`);
    if (!listing.currency) errors.push(`Vehicle listing ${listing.id} missing currency`);
    if (!listing.hourlyRate && !listing.dailyRate) {
      errors.push(`Vehicle listing ${listing.id} missing both hourlyRate and dailyRate`);
    }
    if (!listing.companyId) errors.push(`Vehicle listing ${listing.id} missing companyId`);
  }

  // Check driver listings completeness
  for (const listing of results.driverListings) {
    if (!listing.id) errors.push(`Driver listing missing id`);
    if (!listing.name) errors.push(`Driver listing ${listing.id} missing name`);
    if (!listing.licenseClass) errors.push(`Driver listing ${listing.id} missing licenseClass`);
    if (!listing.languages || listing.languages.length === 0) {
      errors.push(`Driver listing ${listing.id} missing languages`);
    }
    if (!listing.currency) errors.push(`Driver listing ${listing.id} missing currency`);
    if (!listing.hourlyRate && !listing.dailyRate) {
      errors.push(`Driver listing ${listing.id} missing both hourlyRate and dailyRate`);
    }
    if (!listing.companyId) errors.push(`Driver listing ${listing.id} missing companyId`);
  }

  // Check result metadata completeness
  if (results.total === undefined || results.total === null) {
    errors.push('Search results missing total count');
  }
  if (results.page === undefined || results.page === null) {
    errors.push('Search results missing page number');
  }
  if (results.pageSize === undefined || results.pageSize === null) {
    errors.push('Search results missing page size');
  }
  if (results.totalPages === undefined || results.totalPages === null) {
    errors.push('Search results missing total pages');
  }

  // Verify total count matches actual results
  const actualTotal = results.vehicleListings.length + results.driverListings.length;
  if (results.page === 1 && results.total < actualTotal) {
    errors.push(`Total count ${results.total} is less than actual results ${actualTotal} on first page`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Execute a comprehensive search test with the given filters
 */
export async function executeSearchTest(
  filters: SearchFilters,
  scenario?: SearchTestScenario
): Promise<{
  success: boolean;
  results: SearchResult;
  errors: string[];
  performance: {
    duration: number;
    fast: boolean;
    acceptable: boolean;
  };
}> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    // Execute search
    const results = await listingService.searchListings(filters);
    const duration = Date.now() - startTime;

    // Verify results match filters
    const filterValidation = verifySearchResultsMatchFilters(results, filters);
    if (!filterValidation.isValid) {
      errors.push(...filterValidation.errors);
    }

    // Verify results completeness
    const completenessValidation = verifySearchResultsCompleteness(results);
    if (!completenessValidation.isValid) {
      errors.push(...completenessValidation.errors);
    }

    // Verify scenario expectations if provided
    if (scenario) {
      const actualResultCount = results.vehicleListings.length + results.driverListings.length;
      const hasResults = actualResultCount > 0;
      
      if (scenario.expectedBehavior.shouldReturnResults !== undefined) {
        if (scenario.expectedBehavior.shouldReturnResults && !hasResults) {
          errors.push(`Expected results but got none for scenario: ${scenario.name}`);
        }
        if (!scenario.expectedBehavior.shouldReturnResults && hasResults) {
          errors.push(`Expected no results but got ${actualResultCount} for scenario: ${scenario.name}`);
        }
      }

      if (scenario.expectedBehavior.minimumResults !== undefined) {
        if (actualResultCount < scenario.expectedBehavior.minimumResults) {
          errors.push(`Expected at least ${scenario.expectedBehavior.minimumResults} results but got ${actualResultCount}`);
        }
      }

      if (scenario.expectedBehavior.maximumResults !== undefined) {
        if (actualResultCount > scenario.expectedBehavior.maximumResults) {
          errors.push(`Expected at most ${scenario.expectedBehavior.maximumResults} results but got ${actualResultCount}`);
        }
      }

      if (scenario.expectedBehavior.shouldIncludeVehicles !== undefined) {
        const hasVehicles = results.vehicleListings.length > 0;
        if (scenario.expectedBehavior.shouldIncludeVehicles && !hasVehicles) {
          errors.push(`Expected vehicle listings but got none`);
        }
        if (!scenario.expectedBehavior.shouldIncludeVehicles && hasVehicles) {
          errors.push(`Expected no vehicle listings but got ${results.vehicleListings.length}`);
        }
      }

      if (scenario.expectedBehavior.shouldIncludeDrivers !== undefined) {
        const hasDrivers = results.driverListings.length > 0;
        if (scenario.expectedBehavior.shouldIncludeDrivers && !hasDrivers) {
          errors.push(`Expected driver listings but got none`);
        }
        if (!scenario.expectedBehavior.shouldIncludeDrivers && hasDrivers) {
          errors.push(`Expected no driver listings but got ${results.driverListings.length}`);
        }
      }

      if (scenario.expectedBehavior.resultValidation) {
        if (!scenario.expectedBehavior.resultValidation(results)) {
          errors.push(`Custom validation failed for scenario: ${scenario.name}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      performance: {
        duration,
        fast: duration < 100,
        acceptable: duration < 500,
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    errors.push(`Search execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

    return {
      success: false,
      results: {
        vehicleListings: [],
        driverListings: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      },
      errors,
      performance: {
        duration,
        fast: false,
        acceptable: false,
      },
    };
  }
}

/**
 * Run a comprehensive search test suite
 */
export async function runSearchTestSuite(): Promise<{
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: Array<{
    name: string;
    success: boolean;
    errors: string[];
    duration: number;
  }>;
}> {
  const testResults: Array<{
    name: string;
    success: boolean;
    errors: string[];
    duration: number;
  }> = [];

  // Test basic filter combinations
  const filterCombinations = generateSearchFilterCombinations();
  for (let i = 0; i < filterCombinations.length; i++) {
    const filters = filterCombinations[i];
    const testName = `Filter Combination ${i + 1}`;
    
    const result = await executeSearchTest(filters);
    testResults.push({
      name: testName,
      success: result.success,
      errors: result.errors,
      duration: result.performance.duration,
    });
  }

  // Test edge case scenarios
  const edgeCaseScenarios = generateEdgeCaseSearchScenarios();
  for (const scenario of edgeCaseScenarios) {
    const result = await executeSearchTest(scenario.filters, scenario);
    testResults.push({
      name: scenario.name,
      success: result.success,
      errors: result.errors,
      duration: result.performance.duration,
    });
  }

  const passedTests = testResults.filter(r => r.success).length;
  const failedTests = testResults.filter(r => !r.success).length;

  return {
    totalTests: testResults.length,
    passedTests,
    failedTests,
    results: testResults,
  };
}