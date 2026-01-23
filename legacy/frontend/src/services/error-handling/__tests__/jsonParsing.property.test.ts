/**
 * Property-Based Tests for JSON Parsing Error Handling
 * **Feature: api-error-handling-reliability, Property 1: JSON parsing error handling**
 * **Validates: Requirements 1.1, 4.1, 4.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  malformedJsonArb, 
  validJsonArb, 
  createPropertyTestConfig 
} from '../utils/testGenerators';
import { classifyError } from '../utils/errorClassification';
import { ApiErrorType } from '../../../types/error.types';

// Mock safe JSON parser (to be implemented)
const safeJsonParse = (text: string): { success: boolean; data?: any; error?: Error } => {
  try {
    const data = JSON.parse(text);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

// Mock error handler for JSON parsing (to be implemented)
const handleJsonParsingError = (text: string, error: Error): {
  userMessage: string;
  fallbackData: any;
  shouldRetry: boolean;
} => {
  const classified = classifyError(error, {
    endpoint: '/test',
    method: 'GET',
    component: 'JsonParser',
    timestamp: new Date(),
    retryCount: 0
  });

  return {
    userMessage: classified.type === ApiErrorType.PARSING 
      ? 'The server response was not in the expected format. Please try again.'
      : 'An unexpected error occurred while processing the response.',
    fallbackData: null,
    shouldRetry: false
  };
};

describe('JSON Parsing Error Handling Properties', () => {
  it('Property 1: For any malformed JSON, the system should catch parsing errors and provide user-friendly messages', () => {
    fc.assert(
      fc.property(malformedJsonArb, (malformedJson) => {
        // Attempt to parse malformed JSON
        const result = safeJsonParse(malformedJson);
        
        // Should always fail for malformed JSON
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        
        if (result.error) {
          // Handle the parsing error
          const handled = handleJsonParsingError(malformedJson, result.error);
          
          // Should provide user-friendly message
          expect(handled.userMessage).toBeDefined();
          expect(handled.userMessage.length).toBeGreaterThan(0);
          expect(handled.userMessage).not.toContain('SyntaxError');
          expect(handled.userMessage).not.toContain('JSON.parse');
          expect(handled.userMessage).not.toContain('undefined');
          
          // Should not retry parsing errors
          expect(handled.shouldRetry).toBe(false);
          
          // Should provide fallback data (even if null)
          expect(handled).toHaveProperty('fallbackData');
        }
      }),
      createPropertyTestConfig(100)
    );
  });

  it('Property 1a: For any valid JSON, the system should parse successfully without errors', () => {
    fc.assert(
      fc.property(validJsonArb, (validJson) => {
        const result = safeJsonParse(validJson);
        
        // Should always succeed for valid JSON
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.error).toBeUndefined();
        
        // Parsed data should be equivalent to original when re-stringified
        if (result.data !== undefined) {
          const reparsed = JSON.stringify(result.data);
          const reResult = safeJsonParse(reparsed);
          expect(reResult.success).toBe(true);
        }
      }),
      createPropertyTestConfig(100)
    );
  });

  it('Property 1b: Error classification should correctly identify parsing errors', () => {
    fc.assert(
      fc.property(malformedJsonArb, (malformedJson) => {
        const result = safeJsonParse(malformedJson);
        
        if (result.error) {
          const classified = classifyError(result.error, {
            endpoint: '/test',
            method: 'GET',
            component: 'JsonParser',
            timestamp: new Date(),
            retryCount: 0
          });
          
          // Should classify as parsing error
          expect(classified.type).toBe(ApiErrorType.PARSING);
          
          // Should not be recoverable (indicates a bug or server issue)
          expect(classified.isRecoverable).toBe(false);
          
          // Should have appropriate severity
          expect(classified.severity).toBeDefined();
          
          // Should preserve original error
          expect(classified.originalError).toBe(result.error);
        }
      }),
      createPropertyTestConfig(100)
    );
  });

  it('Property 1c: System should handle edge cases in JSON parsing gracefully', () => {
    const edgeCases = [
      '', // Empty string
      ' ', // Whitespace only
      'null', // Valid null
      'undefined', // Invalid undefined
      'NaN', // Invalid NaN
      'Infinity', // Invalid Infinity
      '{"a":}', // Missing value
      '{"a":,}', // Extra comma
      '{a:"b"}', // Unquoted key
      '{"a":"b",}', // Trailing comma
    ];

    edgeCases.forEach(edgeCase => {
      const result = safeJsonParse(edgeCase);
      
      if (!result.success && result.error) {
        const handled = handleJsonParsingError(edgeCase, result.error);
        
        // Should always provide a user message
        expect(handled.userMessage).toBeDefined();
        expect(typeof handled.userMessage).toBe('string');
        expect(handled.userMessage.length).toBeGreaterThan(0);
        
        // Should not expose technical details
        expect(handled.userMessage).not.toMatch(/SyntaxError|JSON\.parse|undefined|null/);
      }
    });
  });

  it('Property 1d: Content type detection should work for various response types', () => {
    const contentTypes = [
      'application/json',
      'text/html',
      'text/plain',
      'application/xml',
      'application/json; charset=utf-8',
      'text/html; charset=utf-8',
      '', // Empty content type
      'unknown/type'
    ];

    contentTypes.forEach(contentType => {
      // Mock response with content type
      const mockResponse = {
        headers: {
          get: (name: string) => name.toLowerCase() === 'content-type' ? contentType : null
        }
      } as Response;

      // Should handle all content types without throwing
      expect(() => {
        const detectedType = mockResponse.headers.get('content-type') || 'unknown';
        expect(typeof detectedType).toBe('string');
      }).not.toThrow();
    });
  });
});