import { describe, it, expect } from 'vitest';
import { openApiSpec } from './spec';

describe('OpenAPI Integration', () => {
  it('should have a valid OpenAPI spec that can be served', () => {
    expect(openApiSpec).toBeDefined();
    expect(openApiSpec.openapi).toBe('3.0.0');
    expect(openApiSpec.info).toBeDefined();
    expect(openApiSpec.info.title).toBe('Vider Transport Marketplace API');
    expect(openApiSpec.paths).toBeDefined();
    expect(openApiSpec.components).toBeDefined();
  });

  it('should include all required API tags in the spec', () => {
    expect(openApiSpec.tags).toBeDefined();
    const tagNames = openApiSpec.tags!.map((tag: any) => tag.name);
    
    expect(tagNames).toContain('Authentication');
    expect(tagNames).toContain('Companies');
    expect(tagNames).toContain('Listings');
    expect(tagNames).toContain('Bookings');
    expect(tagNames).toContain('Payments');
    expect(tagNames).toContain('Ratings');
    expect(tagNames).toContain('Messaging');
    expect(tagNames).toContain('Notifications');
    expect(tagNames).toContain('Admin');
    expect(tagNames).toContain('GDPR');
    expect(tagNames).toContain('Health');
  });

  it('should include security scheme for JWT authentication', () => {
    expect(openApiSpec.components!.securitySchemes).toBeDefined();
    const bearerAuth = openApiSpec.components!.securitySchemes!.bearerAuth as any;
    expect(bearerAuth).toBeDefined();
    expect(bearerAuth.type).toBe('http');
    expect(bearerAuth.scheme).toBe('bearer');
    expect(bearerAuth.bearerFormat).toBe('JWT');
  });

  it('should document all core data models', () => {
    const schemas = openApiSpec.components!.schemas as Record<string, any>;
    expect(schemas).toBeDefined();
    
    // Core business entities
    expect(schemas.User).toBeDefined();
    expect(schemas.Company).toBeDefined();
    expect(schemas.VehicleListing).toBeDefined();
    expect(schemas.DriverListing).toBeDefined();
    expect(schemas.Booking).toBeDefined();
    expect(schemas.Rating).toBeDefined();
    expect(schemas.Message).toBeDefined();
    expect(schemas.Transaction).toBeDefined();
    
    // Supporting types
    expect(schemas.Role).toBeDefined();
    expect(schemas.BookingStatus).toBeDefined();
    expect(schemas.CostBreakdown).toBeDefined();
    expect(schemas.ErrorResponse).toBeDefined();
  });

  it('should be serializable to JSON', () => {
    const jsonString = JSON.stringify(openApiSpec);
    expect(jsonString).toBeDefined();
    expect(jsonString.length).toBeGreaterThan(0);
    
    // Should be able to parse it back
    const parsed = JSON.parse(jsonString);
    expect(parsed.openapi).toBe('3.0.0');
    expect(parsed.info.title).toBe('Vider Transport Marketplace API');
  });

  it('should have proper structure for Swagger UI consumption', () => {
    // Swagger UI requires these top-level properties
    expect(openApiSpec.openapi).toBeDefined();
    expect(openApiSpec.info).toBeDefined();
    expect(openApiSpec.paths).toBeDefined();
    
    // Should have at least one path defined
    const pathKeys = Object.keys(openApiSpec.paths);
    expect(pathKeys.length).toBeGreaterThan(0);
    
    // Should have components with schemas
    expect(openApiSpec.components).toBeDefined();
    expect(openApiSpec.components!.schemas).toBeDefined();
    const schemaKeys = Object.keys(openApiSpec.components!.schemas!);
    expect(schemaKeys.length).toBeGreaterThan(0);
  });
});
