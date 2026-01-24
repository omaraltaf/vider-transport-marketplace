import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import vehicleRoutes from './routes/vehicle.routes.js';
import shipmentRoutes from './routes/shipment.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import platformAdminRoutes from './routes/platform-admin.routes.js';

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/platform-admin', platformAdminRoutes);

// Health Check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        version: '2.0.0-alpha',
    });
});

// Root API
app.get('/api', (req: Request, res: Response) => {
    res.json({
        message: 'Vider Transport Marketplace API v2.0',
        status: 'operational',
    });
});

export default app;
