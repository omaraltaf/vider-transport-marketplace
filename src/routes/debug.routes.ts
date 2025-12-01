import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/debug/db-status
 * Check database connection and table status
 */
router.get('/db-status', async (req: Request, res: Response): Promise<void> => {
  try {
    // Try to connect and count records
    const companies = await prisma.company.count();
    const users = await prisma.user.count();
    const vehicles = await prisma.vehicleListing.count();
    const drivers = await prisma.driverListing.count();
    
    // Get database URL (masked for security)
    const dbUrl = process.env.DATABASE_URL || 'not set';
    const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
    
    res.status(200).json({
      status: 'connected',
      database: maskedUrl,
      tables: {
        companies,
        users,
        vehicles,
        drivers,
      },
      message: companies === 0 ? 'Database is empty - needs seeding' : 'Database has data',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Could not connect to database or tables do not exist',
    });
  }
});

export default router;
