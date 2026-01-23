import { RouteValidator } from './src/services/navigation-audit/RouteValidator.ts';

const mockContext = {
  baseUrl: 'http://localhost:3000',
  currentUser: { id: 'test', role: 'COMPANY_ADMIN', permissions: ['read'] },
  viewport: { width: 1280, height: 720 }
};

const validator = new RouteValidator(mockContext);
validator.addKnownRoute('/search');

const elements = [{ 
  id: '1', 
  type: 'link', 
  selector: '#test', 
  destination: '/search', 
  isAccessible: true 
}];

try {
  const result = await validator.validateRoutes(elements);
  console.log('Result:', JSON.stringify(result, null, 2));
} catch (err) {
  console.error('Error:', err);
}