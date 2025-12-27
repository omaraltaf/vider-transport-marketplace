import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { config } from '../config/env';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/admin-setup
 * One-time endpoint to create platform administrator
 * Protected by a secret key
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for secret key in header
    const secretKey = req.headers['x-admin-secret'];
    
    if (!secretKey || secretKey !== config.JWT_SECRET) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Invalid admin setup secret',
        },
      });
      return;
    }

    console.log('🔧 Creating platform administrator...');

    // Check if platform admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@vider.no' }
    });

    if (existingAdmin) {
      res.status(200).json({
        message: 'Platform admin already exists',
        account: {
          email: 'admin@vider.no',
          role: 'PLATFORM_ADMIN',
          status: 'existing'
        }
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash('password123', 12);

    // Find or create a platform admin company
    let platformCompany = await prisma.company.findFirst({
      where: { 
        OR: [
          { name: 'Vider Platform Administration' },
          { organizationNumber: '999888777' }
        ]
      }
    });

    if (!platformCompany) {
      // Use an existing company or create one
      const existingCompany = await prisma.company.findFirst();
      
      if (existingCompany) {
        platformCompany = existingCompany;
        console.log('✅ Using existing company for platform admin:', platformCompany.name);
      } else {
        // Create platform admin company with unique org number
        platformCompany = await prisma.company.create({
          data: {
            name: 'Vider Platform Administration',
            organizationNumber: '999888777',
            businessAddress: 'Platform HQ, Storgata 1',
            city: 'Oslo',
            postalCode: '0001',
            fylke: 'Oslo',
            kommune: 'Oslo',
            vatRegistered: true,
            description: 'Platform administration and management',
            verified: true,
            verifiedAt: new Date(),
          },
        });
        console.log('✅ Created platform administration company');
      }
    }

    // Create platform admin user
    const platformAdmin = await prisma.user.create({
      data: {
        email: 'admin@vider.no',
        passwordHash,
        role: 'PLATFORM_ADMIN',
        companyId: platformCompany.id,
        firstName: 'Platform',
        lastName: 'Administrator',
        phone: '+47 12345678',
        emailVerified: true,
      },
    });

    console.log('✅ Platform administrator created successfully!');

    res.status(201).json({
      message: 'Platform administrator created successfully!',
      account: {
        email: 'admin@vider.no',
        password: 'password123',
        role: 'PLATFORM_ADMIN',
        status: 'created'
      },
      warning: 'IMPORTANT: Change the default password after first login!'
    });

  } catch (error) {
    console.error('❌ Error creating platform admin:', error);
    
    res.status(500).json({
      error: {
        code: 'ADMIN_SETUP_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create platform admin',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default router;