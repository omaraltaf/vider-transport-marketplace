import { describe, it, expect } from 'vitest';
import { RouteValidator } from '../RouteValidator';
import type { AuditContext, NavigationElement } from '../interfaces';

describe('Debug RouteValidator', () => {
  it('should debug basic route validation', async () => {
    const mockContext: AuditContext = {
      baseUrl: 'http://localhost:3000',
      currentUser: { id: 'test', role: 'COMPANY_ADMIN', permissions: ['read'] },
      viewport: { width: 1280, height: 720 }
    };

    const validator = new RouteValidator(mockContext);
    validator.addKnownRoute('/search');

    const elements: NavigationElement[] = [{ 
      id: '1', 
      type: 'link', 
      selector: '#test', 
      destination: '/search', 
      isAccessible: true 
    }];

    const result = await validator.validateRoutes(elements);
    console.log('Debug Result:', JSON.stringify(result, null, 2));
    
    expect(result.validRoutes.length).toBeGreaterThan(0);
    expect(result.validRoutes[0].path).toBe('/search');
  });
});