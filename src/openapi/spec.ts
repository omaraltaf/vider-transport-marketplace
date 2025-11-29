import { OpenAPIV3 } from 'openapi-types';
import { schemas } from './schemas';
import { paths } from './paths';
import { responses } from './responses';

export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'Vider Transport Marketplace API',
    version: '1.0.0',
    description: 'Peer-to-peer marketplace platform for Norwegian B2B transport and logistics. Enables transport companies to rent vehicles and drivers to one another.',
    contact: {
      name: 'Vider Platform Support',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://api.vider.no',
      description: 'Production server',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'User registration, login, and session management' },
    { name: 'Companies', description: 'Company profile management and verification' },
    { name: 'Listings', description: 'Vehicle and driver listing management' },
    { name: 'Bookings', description: 'Booking request and lifecycle management' },
    { name: 'Payments', description: 'Invoice and receipt generation' },
    { name: 'Ratings', description: 'Rating and review management' },
    { name: 'Messaging', description: 'Booking-related messaging' },
    { name: 'Notifications', description: 'Notification preferences and delivery' },
    { name: 'Admin', description: 'Platform administration and analytics' },
    { name: 'GDPR', description: 'Data export and deletion' },
    { name: 'Health', description: 'System health monitoring' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT authentication token',
      },
    },
    schemas,
    responses,
  },
  paths,
  security: [],
};
