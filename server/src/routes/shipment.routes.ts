import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import prisma from '../config/database.js';
import { ShipmentStatus } from '@prisma/client';

const router = Router();

// 1. Get all open shipments (Marketplace)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const shipments = await prisma.shipment.findMany({
            where: {
                status: ShipmentStatus.OPEN,
            },
            include: {
                shipper: {
                    select: {
                        name: true,
                        city: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.json(shipments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching shipments' });
    }
});

// 2. Create a new shipment request
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?.companyId) {
        return res.status(403).json({ message: 'User not associated with a company' });
    }

    const {
        title,
        description,
        pickupLocation,
        deliveryLocation,
        pickupDate,
        deliveryDate,
        budget,
    } = req.body;

    try {
        const shipment = await prisma.shipment.create({
            data: {
                shipperId: req.user.companyId,
                title,
                description,
                pickupLocation,
                deliveryLocation,
                pickupDate: new Date(pickupDate),
                deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
                budget: budget ? parseFloat(budget) : undefined,
            },
        });

        res.status(201).json(shipment);
    } catch (error) {
        res.status(500).json({ message: 'Error creating shipment request' });
    }
});

export default router;
