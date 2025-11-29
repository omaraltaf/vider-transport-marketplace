import { describe, it, expect } from 'vitest';
import { openApiSpec } from './spec';

describe('OpenAPI Specification', () => {
  it('should have valid OpenAPI 3.0.0 structure', () => {
    expect(openApiSpec.openapi).toBe('3.0.0');
    expect(openApiSpec.info).toBeDefined();
    expect(openApiSpec.info.title).toBe('Vider Transport Marketplace API');
    expect(openApiSpec.info.version).toBe('1.0.0');
  });

  it('should have servers defined', () => {
    expect(openApiSpec.servers).toBeDefined();
    expect(openApiSpec.servers!.length).toBeGreaterThan(0);
  });

  it('should have tags defined', () => {
    expect(openApiSpec.tags).toBeDefined();
    expect(openApiSpec.tags!.length).toBeGreaterThan(0);
    
    const tagNames = openApiSpec.tags!.map(tag => tag.name);
    expect(tagNames).toContain('Authentication');
    expect(tagNames).toContain('Companies');
    expect(tagNames).toContain('Listings');
    expect(tagNames).toContain('Bookings');
    expect(tagNames).toContain('Health');
  });

  it('should have security schemes defined', () => {
    expect(openApiSpec.components).toBeDefined();
    expect(openApiSpec.components!.securitySchemes).toBeDefined();
    expect(openApiSpec.components!.securitySchemes!.bearerAuth).toBeDefined();
  });

  it('should have schemas defined', () => {
    expect(openApiSpec.components!.schemas).toBeDefined();
    const schemas = openApiSpec.components!.schemas as Record<string, any>;
    
    // Check key schemas exist
    expect(schemas.ErrorResponse).toBeDefined();
    expect(schemas.User).toBeDefined();
    expect(schemas.Company).toBeDefined();
    expect(schemas.VehicleListing).toBeDefined();
    expect(schemas.DriverListing).toBeDefined();
    expect(schemas.Booking).toBeDefined();
    expect(schemas.Rating).toBeDefined();
    expect(schemas.Message).toBeDefined();
    expect(schemas.HealthStatus).toBeDefined();
  });

  it('should have responses defined', () => {
    expect(openApiSpec.components!.responses).toBeDefined();
    const responses = openApiSpec.components!.responses as Record<string, any>;
    
    expect(responses.BadRequest).toBeDefined();
    expect(responses.Unauthorized).toBeDefined();
    expect(responses.Forbidden).toBeDefined();
    expect(responses.NotFound).toBeDefined();
    expect(responses.Conflict).toBeDefined();
    expect(responses.RateLimitExceeded).toBeDefined();
    expect(responses.InternalError).toBeDefined();
  });

  it('should have paths defined', () => {
    expect(openApiSpec.paths).toBeDefined();
    const paths = openApiSpec.paths as Record<string, any>;
    
    // Check key endpoints exist
    expect(paths['/health']).toBeDefined();
    expect(paths['/api/auth/register']).toBeDefined();
    expect(paths['/api/auth/login']).toBeDefined();
    expect(paths['/api/companies/{id}']).toBeDefined();
    expect(paths['/api/listings/vehicles']).toBeDefined();
    expect(paths['/api/bookings']).toBeDefined();
    expect(paths['/api/ratings']).toBeDefined();
    expect(paths['/api/gdpr/export']).toBeDefined();
  });

  it('should document all required data model fields', () => {
    const schemas = openApiSpec.components!.schemas as Record<string, any>;
    
    // Company schema should have all required fields
    const company = schemas.Company;
    expect(company.required).toContain('id');
    expect(company.required).toContain('name');
    expect(company.required).toContain('organizationNumber');
    expect(company.required).toContain('verified');
    
    // Booking schema should have cost breakdown
    const booking = schemas.Booking;
    expect(booking.required).toContain('costs');
    expect(booking.properties.costs.$ref).toBe('#/components/schemas/CostBreakdown');
    
    // CostBreakdown should have all financial fields
    const costBreakdown = schemas.CostBreakdown;
    expect(costBreakdown.required).toContain('providerRate');
    expect(costBreakdown.required).toContain('platformCommission');
    expect(costBreakdown.required).toContain('taxes');
    expect(costBreakdown.required).toContain('total');
  });

  it('should document authentication requirements', () => {
    const paths = openApiSpec.paths as Record<string, any>;
    
    // Public endpoints should not require auth
    expect(paths['/health'].get.security).toBeUndefined();
    expect(paths['/api/auth/register'].post.security).toBeUndefined();
    expect(paths['/api/auth/login'].post.security).toBeUndefined();
    
    // Protected endpoints should require bearerAuth
    expect(paths['/api/companies/{id}'].put.security).toBeDefined();
    expect(paths['/api/companies/{id}'].put.security[0]).toHaveProperty('bearerAuth');
    
    expect(paths['/api/bookings'].post.security).toBeDefined();
    expect(paths['/api/bookings'].post.security[0]).toHaveProperty('bearerAuth');
  });

  it('should document request and response schemas', () => {
    const paths = openApiSpec.paths as Record<string, any>;
    
    // Registration endpoint should have request body
    const registerEndpoint = paths['/api/auth/register'].post;
    expect(registerEndpoint.requestBody).toBeDefined();
    expect(registerEndpoint.requestBody.required).toBe(true);
    expect(registerEndpoint.requestBody.content['application/json'].schema.$ref).toBe('#/components/schemas/CompanyRegistrationData');
    
    // Should have response schemas
    expect(registerEndpoint.responses['201']).toBeDefined();
    expect(registerEndpoint.responses['400']).toBeDefined();
    expect(registerEndpoint.responses['409']).toBeDefined();
  });

  it('should document all HTTP methods for endpoints', () => {
    const paths = openApiSpec.paths as Record<string, any>;
    
    // Company endpoint should have GET and PUT
    expect(paths['/api/companies/{id}'].get).toBeDefined();
    expect(paths['/api/companies/{id}'].put).toBeDefined();
    
    // Bookings endpoint should have POST and GET
    expect(paths['/api/bookings'].post).toBeDefined();
    expect(paths['/api/bookings'].get).toBeDefined();
  });

  it('should document path parameters', () => {
    const paths = openApiSpec.paths as Record<string, any>;
    
    // Company endpoint should have id parameter
    const getCompany = paths['/api/companies/{id}'].get;
    expect(getCompany.parameters).toBeDefined();
    expect(getCompany.parameters.length).toBeGreaterThan(0);
    expect(getCompany.parameters[0].name).toBe('id');
    expect(getCompany.parameters[0].in).toBe('path');
    expect(getCompany.parameters[0].required).toBe(true);
  });

  it('should document query parameters', () => {
    const paths = openApiSpec.paths as Record<string, any>;
    
    // Search endpoint should have query parameters
    const searchVehicles = paths['/api/listings/vehicles'].get;
    expect(searchVehicles.parameters).toBeDefined();
    expect(searchVehicles.parameters.length).toBeGreaterThan(0);
    
    const paramNames = searchVehicles.parameters.map((p: any) => p.name);
    expect(paramNames).toContain('vehicleType');
    expect(paramNames).toContain('fylke');
    expect(paramNames).toContain('page');
    expect(paramNames).toContain('limit');
  });

  it('should document enum types', () => {
    const schemas = openApiSpec.components!.schemas as Record<string, any>;
    
    // Role enum
    expect(schemas.Role.enum).toBeDefined();
    expect(schemas.Role.enum).toContain('PLATFORM_ADMIN');
    expect(schemas.Role.enum).toContain('COMPANY_ADMIN');
    expect(schemas.Role.enum).toContain('COMPANY_USER');
    
    // BookingStatus enum
    expect(schemas.BookingStatus.enum).toBeDefined();
    expect(schemas.BookingStatus.enum).toContain('PENDING');
    expect(schemas.BookingStatus.enum).toContain('ACCEPTED');
    expect(schemas.BookingStatus.enum).toContain('COMPLETED');
  });

  it('should document field constraints', () => {
    const schemas = openApiSpec.components!.schemas as Record<string, any>;
    
    // Rating stars should have min/max constraints
    const rating = schemas.Rating;
    expect(rating.properties.companyStars.minimum).toBe(1);
    expect(rating.properties.companyStars.maximum).toBe(5);
    
    // Organization number should have pattern
    const registrationData = schemas.CompanyRegistrationData;
    expect(registrationData.properties.organizationNumber.pattern).toBeDefined();
  });
});
