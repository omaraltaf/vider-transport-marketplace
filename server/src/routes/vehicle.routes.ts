import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import prisma from '../config/database.js';
import { VehicleType, VehicleStatus } from '@prisma/client';

const router = Router();

// 1. Get all available vehicles (Marketplace)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const vehicles = await prisma.vehicle.findMany({
            where: {
                status: VehicleStatus.AVAILABLE,
            },
            include: {
                company: {
                    select: {
                        name: true,
                        city: true,
                        verified: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching vehicles' });
    }
});

// 2. Get my company's fleet
router.get('/my-fleet', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?.companyId) {
        return res.status(403).json({ message: 'User not associated with a company' });
    }

    try {
        const vehicles = await prisma.vehicle.findMany({
            where: {
                companyId: req.user.companyId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching your fleet' });
    }
});

// 3. Add a new vehicle
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?.companyId) {
        return res.status(403).json({ message: 'User not associated with a company' });
    }

    const {
        type,
        make,
        model,
        year,
        registrationNumber,
        capacityKg,
        volumeM3,
        hourlyRate,
        dailyRate,
    } = req.body;

    try {
        const vehicle = await prisma.vehicle.create({
            data: {
                companyId: req.user.companyId,
                type: type as VehicleType,
                make,
                model,
                year: year ? parseInt(year) : undefined,
                registrationNumber,
                capacityKg: parseFloat(capacityKg),
                volumeM3: volumeM3 ? parseFloat(volumeM3) : undefined,
                hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
                dailyRate: dailyRate ? parseFloat(dailyRate) : undefined,
                status: VehicleStatus.AVAILABLE,
            },
        });

        res.status(201).json(vehicle);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Registration number already exists' });
        }
        res.status(500).json({ message: 'Error creating vehicle' });
    }
});

// 4. Update a vehicle
router.patch('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?.companyId) {
        return res.status(403).json({ message: 'User not associated with a company' });
    }

    const { id } = req.params;
    const updateData = req.body;

    try {
        // Ensure the vehicle belongs to the user's company
        const existingVehicle = await prisma.vehicle.findFirst({
            where: { id: id as string, companyId: req.user.companyId as string },
        });

        if (!existingVehicle) {
            return res.status(404).json({ message: 'Vehicle not found or unauthorized' });
        }

        const updatedVehicle = await prisma.vehicle.update({
            where: { id: id as string },
            data: updateData,
        });

        res.json(updatedVehicle);
    } catch (error) {
        res.status(500).json({ message: 'Error updating vehicle' });
    }
});

export default router;
