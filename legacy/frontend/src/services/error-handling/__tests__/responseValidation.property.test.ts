/**
 * Property-Based Tests for Response Validation and Sanitization
 * **Feature: api-error-handling-reliability, Property 9: Response validation and sanitization**
 * **Validates: Requirements 4.2, 4.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ResponseValidator } from '../ResponseValidator';
import { 
  validJsonArb, 
  malformedJsonArb, 
  apiResponseScenarioArb,
  createPropertyTestConfig 
} from '../utils/testGenerators';

// Mock Response class for testing
class MockResponse {
  constructor(
    private body: string,
    private init: { status?: number; statusText?: string; headers?: Record<string, string> } = {}
  ) {}

  get ok() {
    return (this.init.status || 200) >= 200 && (this.init.status || 200) < 300;
  }

  get status() {
    return this.init.status || 200;
  }

  get statusText() {
    return this.init.statusText || 'OK';
  }

  get headers() {
    return {
      get: (name: string) => this.init.headers?.[name.toLowerCase()] || null
    };
  }

  async text() {
    return this.body;
  }
}

describe('Response Validation and Sanitization Properties', () => {
  const validator = new ResponseValidator();

  it('Property 9: For any response data with unexpected formats, the system should sanitize to prevent UI breaks', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.float(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
          fc.array(fc.anything()),
          fc.dictionary(fc.string(), fc.anything())
        ),
        (unsafeData) => {
          // Sanitize the data
          const sanitized = validator.sanitizeData(unsafeData);
          
          // Sanitized data should be safe for JSON serialization
          expect(() => JSON.stringify(sanitized)).not.toThrow();
          
          // Should handle null and undefined gracefully
          if (unsafeData === null || unsafeData === undefined) {
            expect(sanitized).toBe(unsafeData);
          }
          
          // Numbers should be finite or null
          if (typeof sanitized === 'number') {
            expect(isFinite(sanitized)).toBe(true);
          }
        }
      ),
      createPropertyTestConfig(100)
    );
  });

  it('Property 9a: For any valid JSON response, validation should succeed', () => {
    fc.assert(
      fc.property(validJsonArb, async (validJson) => {
        const mockResponse = new MockResponse(validJson, {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
        
        const result = await validator.validateResponse(mockResponse as any);
        
        // Valid JSON with 200 status should be valid
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.sanitizedData).toBeDefined();
      }),
      createPropertyTestConfig(50)
    );
  });

  it('Property 9b: For any malformed JSON response, validation should fail gracefully', () => {
    fc.assert(
      fc.property(malformedJsonArb, async (malformedJson) => {
        const mockResponse = new MockResponse(malformedJson, {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
        
        const result = await validator.validateResponse(mockResponse as any);
        
        // Malformed JSON should be invalid
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        
        // Should have a JSON parse error
        const jsonError = result.errors.find(e => e.code === 'JSON_PARSE_ERROR');
        expect(jsonError).toBeDefined();
        expect(jsonError?.message).toContain('Invalid JSON');
      }),
      createPropertyTestConfig(50)
    );
  });

  it('Property 9c: Content type detection should work correctly', () => {
    const contentTypes = [
      'application/json',
      'application/json; charset=utf-8',
      'text/html',
      'text/html; charset=utf-8',
      'text/plain',
      'application/xml',
      'text/xml',
      'unknown/type',
      ''
    ];

    contentTypes.forEach(contentType => {
      const mockResponse = new MockResponse('test', {
        headers: { 'content-type': contentType }
      });
      
      const detectedType = validator.detectContentType(mockResponse as any);
      
      // Should detect known types correctly
      if (contentType.includes('json')) {
        expect(detectedType).toBe('application/json');
      } else if (contentType.includes('html')) {
        expect(detectedType).toBe('text/html');
      } else if (contentType.includes('plain')) {
        expect(detectedType).toBe('text/plain');
      } else if (contentType.includes('xml')) {
        expect(detectedType).toBe('application/xml');
      } else {
        expect(detectedType).toBe('unknown');
      }
    });
  });

  it('Property 9d: Required field validation should work correctly', () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string(), fc.anything()),
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
        (data, requiredFields) => {
          const errors = validator.validateRequiredFields(data, requiredFields);
          
          // Check that missing fields are reported
          const missingFields = requiredFields.filter(field => !(field in data));
          const missingErrors = errors.filter(e => e.code === 'MISSING_REQUIRED_FIELD');
          
          expect(missingErrors).toHaveLength(missingFields.length);
          
          // Each missing field should have an error
          missingFields.forEach(field => {
            const fieldError = missingErrors.find(e => e.field === field);
            expect(fieldError).toBeDefined();
            expect(fieldError?.message).toContain(`Required field '${field}' is missing`);
          });
        }
      ),
      createPropertyTestConfig(50)
    );
  });

  it('Property 9e: Default values should be applied correctly', () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string(), fc.anything()),
        fc.dictionary(fc.string(), fc.anything()),
        (partialData, defaults) => {
          const result = validator.applyDefaults(partialData, defaults);
          
          // Result should contain all default values
          Object.keys(defaults).forEach(key => {
            expect(result).toHaveProperty(key);
          });
          
          // Partial data should override defaults
          Object.keys(partialData).forEach(key => {
            expect(result[key]).toBe(partialData[key]);
          });
          
          // Should be a complete object
          expect(typeof result).toBe('object');
          expect(result).not.toBeNull();
        }
      ),
      createPropertyTestConfig(50)
    );
  });
});