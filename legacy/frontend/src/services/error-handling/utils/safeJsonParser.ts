/**
 * Safe JSON Parser Utilities
 * Provides graceful JSON parsing with comprehensive error handling
 */

import { responseValidator } from '../ResponseValidator';
import type { ValidationResult } from '../../../types/error.types';

export interface SafeJsonResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  originalText?: string;
}

export interface JsonParseOptions {
  fallbackValue?: unknown;
  throwOnError?: boolean;
  sanitize?: boolean;
  maxLength?: number;
}

/**
 * Safely parses JSON with comprehensive error handling
 */
export function safeJsonParse<T = unknown>(
  text: string, 
  options: JsonParseOptions = {}
): SafeJsonResult<T> {
  const {
    fallbackValue = null,
    throwOnError = false,
    sanitize = true,
    maxLength = 1024 * 1024 // 1MB default limit
  } = options;

  // Input validation
  if (typeof text !== 'string') {
    const error = new Error('Input must be a string');
    if (throwOnError) throw error;
    return {
      success: false,
      error,
      data: fallbackValue as T,
      originalText: String(text)
    };
  }

  // Check length limit
  if (text.length > maxLength) {
    const error = new Error(`JSON string too long: ${text.length} > ${maxLength}`);
    if (throwOnError) throw error;
    return {
      success: false,
      error,
      data: fallbackValue as T,
      originalText: text.slice(0, 100) + '...'
    };
  }

  // Handle empty or whitespace-only strings
  const trimmed = text.trim();
  if (!trimmed) {
    const error = new Error('Empty or whitespace-only JSON string');
    if (throwOnError) throw error;
    return {
      success: false,
      error,
      data: fallbackValue as T,
      originalText: text
    };
  }

  try {
    let parsed = JSON.parse(trimmed);
    
    // Sanitize if requested
    if (sanitize) {
      parsed = responseValidator.sanitizeData(parsed);
    }
    
    return {
      success: true,
      data: parsed as T,
      originalText: text
    };
  } catch (error) {
    const parseError = error as Error;
    const enhancedError = enhanceJsonError(parseError, trimmed);
    
    if (throwOnError) throw enhancedError;
    
    return {
      success: false,
      error: enhancedError,
      data: fallbackValue as T,
      originalText: text
    };
  }
}

/**
 * Enhances JSON parsing errors with helpful context
 */
function enhanceJsonError(error: Error, text: string): Error {
  let message = error.message;
  
  // Add position context for syntax errors
  const positionMatch = message.match(/position (\d+)/);
  if (positionMatch) {
    const position = parseInt(positionMatch[1]);
    const context = getErrorContext(text, position);
    message += `\nContext: ${context}`;
  }
  
  // Add common error suggestions
  if (message.includes('Unexpected token')) {
    message += '\nSuggestion: Check for missing quotes, commas, or brackets';
  } else if (message.includes('Unexpected end')) {
    message += '\nSuggestion: Check for unclosed brackets or quotes';
  }
  
  const enhancedError = new Error(message);
  enhancedError.name = 'JsonParseError';
  enhancedError.stack = error.stack;
  
  return enhancedError;
}

/**
 * Gets context around an error position
 */
function getErrorContext(text: string, position: number, contextLength = 20): string {
  const start = Math.max(0, position - contextLength);
  const end = Math.min(text.length, position + contextLength);
  
  const before = text.slice(start, position);
  const after = text.slice(position, end);
  const errorChar = text[position] || 'EOF';
  
  return `"${before}[${errorChar}]${after}"`;
}

/**
 * Attempts to fix common JSON issues
 */
export function attemptJsonFix(text: string): string {
  let fixed = text.trim();
  
  // Fix trailing commas
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix unquoted keys (simple cases)
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  
  // Fix single quotes to double quotes
  fixed = fixed.replace(/'/g, '"');
  
  // Fix undefined values
  fixed = fixed.replace(/:\s*undefined/g, ': null');
  
  return fixed;
}

/**
 * Parses JSON with automatic fixing attempts
 */
export function parseJsonWithFixes<T = unknown>(
  text: string,
  options: JsonParseOptions = {}
): SafeJsonResult<T> {
  // First attempt: parse as-is
  let result = safeJsonParse<T>(text, options);
  if (result.success) {
    return result;
  }
  
  // Second attempt: try with fixes
  try {
    const fixed = attemptJsonFix(text);
    result = safeJsonParse<T>(fixed, options);
    if (result.success) {
      return {
        ...result,
        originalText: text // Keep original for reference
      };
    }
  } catch {
    // Fixing failed, return original error
  }
  
  return result;
}

/**
 * Validates JSON structure against expected format
 */
export function validateJsonStructure(
  data: unknown,
  expectedStructure: Record<string, string>
): ValidationResult {
  const errors: Array<{ field: string; message: string; code: string; value?: unknown }> = [];
  
  if (!data || typeof data !== 'object') {
    errors.push({
      field: 'root',
      message: 'Expected object at root level',
      code: 'INVALID_ROOT_TYPE',
      value: data
    });
    return { isValid: false, errors };
  }
  
  const dataObj = data as Record<string, unknown>;
  
  for (const [field, expectedType] of Object.entries(expectedStructure)) {
    const value = dataObj[field];
    
    if (value === undefined) {
      errors.push({
        field,
        message: `Missing required field: ${field}`,
        code: 'MISSING_FIELD',
        value: undefined
      });
      continue;
    }
    
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== expectedType && !(expectedType === 'array' && Array.isArray(value))) {
      errors.push({
        field,
        message: `Expected ${expectedType} but got ${actualType}`,
        code: 'TYPE_MISMATCH',
        value
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: data
  };
}

/**
 * Creates a JSON parser with specific configuration
 */
export function createJsonParser(defaultOptions: JsonParseOptions = {}) {
  return {
    parse: <T = unknown>(text: string, options?: JsonParseOptions): SafeJsonResult<T> => {
      return safeJsonParse<T>(text, { ...defaultOptions, ...options });
    },
    
    parseWithFixes: <T = unknown>(text: string, options?: JsonParseOptions): SafeJsonResult<T> => {
      return parseJsonWithFixes<T>(text, { ...defaultOptions, ...options });
    },
    
    validate: (data: unknown, structure: Record<string, string>): ValidationResult => {
      return validateJsonStructure(data, structure);
    }
  };
}

// Default parser instance
export const jsonParser = createJsonParser({
  sanitize: true,
  throwOnError: false,
  maxLength: 1024 * 1024 // 1MB
});