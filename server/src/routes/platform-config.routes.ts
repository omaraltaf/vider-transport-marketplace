import { Router, Response } from 'express';
import { authenticate, requirePlatformAdmin, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import prisma from '../config/database.js';

const router = Router();

// Get platform configuration (Public - for price calculations)
router.get('/public', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const config = await prisma.platformConfig.findFirst() || {
            platformFeePercent: 5.0,
            taxPercent: 25.0,
            platformFeeDiscountPercent: 0.0
        };
        res.json({ success: true, data: config });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to fetch public platform configuration' });
    }
});

// Get platform configuration (Admin)
router.get('/', authenticate, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        let config = await prisma.platformConfig.findFirst();

        if (!config) {
            // Initialize with defaults if not exists
            config = await prisma.platformConfig.create({
                data: {
                    id: 'default',
                    platformFeePercent: 5.0,
                    taxPercent: 25.0,
                    platformFeeDiscountPercent: 0.0
                }
            });
        }

        res.json({ success: true, data: config });
    } catch (error: any) {
        console.error('Error fetching platform config:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch platform configuration' });
    }
});

// Update platform configuration
router.patch('/', authenticate, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { platformFeePercent, taxPercent, platformFeeDiscountPercent } = req.body;

    try {
        const config = await prisma.platformConfig.upsert({
            where: { id: 'default' },
            update: {
                platformFeePercent: parseFloat(platformFeePercent),
                taxPercent: parseFloat(taxPercent),
                platformFeeDiscountPercent: parseFloat(platformFeeDiscountPercent)
            },
            create: {
                id: 'default',
                platformFeePercent: parseFloat(platformFeePercent),
                taxPercent: parseFloat(taxPercent),
                platformFeeDiscountPercent: parseFloat(platformFeeDiscountPercent)
            }
        });

        res.json({ success: true, data: config });
    } catch (error: any) {
        console.error('Error updating platform config:', error);
        res.status(500).json({ success: false, error: 'Failed to update platform configuration' });
    }
});

export default router;
