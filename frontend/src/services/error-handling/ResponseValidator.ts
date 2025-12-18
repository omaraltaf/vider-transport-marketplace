/**
 * Response Validator Service
 * Validates and sanitizes API responses before processing
 */

import type { IResponseValidator, Schema, ContentType } from './interfaces';
import type { ValidationResult, ValidationError } from '../../types/error.types';

export class ResponseValidator implements IResponseValidator {
  /**
   * Validates an API response
   */
  async validateResponse(response: Response): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    let sanitizedData: unknown = null;

    try {
      // Check if response is ok
      if (!response.ok) {
        errors.push({
          field: 'status',
          message: `HTTP ${response.status}: ${response.statusText}`,
          code: 'HTTP_ERROR',
          value: response.status
        });
      }

      // Detect content type
      const contentType = this.detectContentType(response);
      
      // Get response text
      const responseText = await response.text();
      
      // Validate based on content type
      if (contentType === 'application/json') {
        const jsonResult = this.validateJson(responseText);
        if (!jsonResult.isValid) {
          errors.push(...jsonResult.errors);
        } else {
          sanitizedData = jsonResult.sanitizedData;
        }
      } else if (contentType === 'text/html' && response.ok) {
        // HTML response when JSON expected
        errors.push({
          field: 'content-type',
          message: 'Expected JSON but received HTML. This may indicate a server error or redirect.',
          code: 'CONTENT_TYPE_MISMATCH',
          value: contentType
        });
      } else {
        // Other content types
        sanitizedData = responseText;
      }

    } catch (error) {
      errors.push({
        field: 'response',
        message: `Failed to process response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'PROCESSING_ERROR',
        value: error
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };
  }

  /**
   * Sanitizes data according to a schema
   */
  sanitizeData<T>(data: unknown, schema?: Schema<T>): T {
    if (schema) {
      return schema.sanitize(data);
    }

    // Basic sanitization without schema
    return this.basicSanitize(data) as T;
  }

  /**
   * Detects the content type of a response
   */
  detectContentType(response: Response): ContentType {
    const contentTypeHeader = response.headers.get('content-type');
    
    if (!contentTypeHeader) {
      return 'unknown';
    }

    const contentType = contentTypeHeader.toLowerCase();
    
    if (contentType.includes('application/json')) {
      return 'application/json';
    } else if (contentType.includes('text/html')) {
      return 'text/html';
    } else if (contentType.includes('text/plain')) {
      return 'text/plain';
    } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      return 'application/xml';
    }
    
    return 'unknown';
  }

  /**
   * Checks if a string is valid JSON
   */
  isValidJson(text: string): boolean {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates JSON content
   */
  private validateJson(text: string): ValidationResult {
    const errors: ValidationError[] = [];
    let sanitizedData: unknown = null;

    if (!text || text.trim() === '') {
      errors.push({
        field: 'json',
        message: 'Response body is empty',
        code: 'EMPTY_RESPONSE',
        value: text
      });
      return { isValid: false, errors };
    }

    try {
      sanitizedData = JSON.parse(text);
      
      // Additional JSON validation
      if (sanitizedData === undefined) {
        errors.push({
          field: 'json',
          message: 'JSON parsed to undefined',
          code: 'INVALID_JSON_VALUE',
          value: text
        });
      }

    } catch (error) {
      const parseError = error as Error;
      errors.push({
        field: 'json',
        message: `Invalid JSON: ${parseError.message}`,
        code: 'JSON_PARSE_ERROR',
        value: text
      });

      // Try to provide helpful error context
      if (parseError.message.includes('Unexpected token')) {
        const match = parseError.message.match(/position (\d+)/);
        if (match) {
          const position = parseInt(match[1]);
          const context = this.getJsonErrorContext(text, position);
          errors[errors.length - 1].message += `. Context: ${context}`;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };
  }

  /**
   * Provides context around a JSON parsing error
   */
  private getJsonErrorContext(text: string, position: number): string {
    const start = Math.max(0, position - 20);
    const end = Math.min(text.length, position + 20);
    const before = text.slice(start, position);
    const after = text.slice(position, end);
    return `"${before}[ERROR HERE]${after}"`;
  }

  /**
   * Basic data sanitization without schema
   */
  private basicSanitize(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      // Basic string sanitization
      return data.trim();
    }

    if (typeof data === 'number') {
      // Handle special number values
      if (!isFinite(data)) {
        return null;
      }
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.basicSanitize(item));
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        // Sanitize key (remove potentially dangerous characters)
        const cleanKey = key.replace(/[<>\"'&]/g, '');
        if (cleanKey) {
          sanitized[cleanKey] = this.basicSanitize(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Creates a safe JSON parser that handles errors gracefully
   */
  createSafeJsonParser() {
    return {
      parse: (text: string) => {
        const result = this.validateJson(text);
        if (result.isValid) {
          return { success: true, data: result.sanitizedData };
        } else {
          return { 
            success: false, 
            error: new Error(result.errors[0]?.message || 'JSON parsing failed'),
            errors: result.errors
          };
        }
      }
    };
  }

  /**
   * Validates that response contains expected fields
   */
  validateRequiredFields(data: unknown, requiredFields: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!data || typeof data !== 'object') {
      errors.push({
        field: 'data',
        message: 'Response data is not an object',
        code: 'INVALID_DATA_TYPE',
        value: data
      });
      return errors;
    }

    const dataObj = data as Record<string, unknown>;
    
    for (const field of requiredFields) {
      if (!(field in dataObj) || dataObj[field] === undefined) {
        errors.push({
          field,
          message: `Required field '${field}' is missing`,
          code: 'MISSING_REQUIRED_FIELD',
          value: undefined
        });
      }
    }

    return errors;
  }

  /**
   * Provides default values for missing fields
   */
  applyDefaults<T extends Record<string, unknown>>(
    data: Partial<T>, 
    defaults: Partial<T>
  ): T {
    return { ...defaults, ...data } as T;
  }
}

// Singleton instance
export const responseValidator = new ResponseValidator();