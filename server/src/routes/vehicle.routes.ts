import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import prisma from '../config/database.js';
import { VehicleType, VehicleStatus } from '@prisma/client';

const router = Router();

// 1. Get all vehicles (Marketplace)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const vehicles = await prisma.vehicle.findMany({
            include: {
                company: {
                    select: {
                        name: true,
                        city: true,
                        verified: true,
                        reviewsReceived: {
                            select: {
                                rating: true
                            }
                        }
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Add average rating and review count to each vehicle's company
        const vehiclesWithRatings = vehicles.map(vehicle => {
            const reviews = vehicle.company.reviewsReceived;
            const avgRating = reviews.length > 0
                ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
                : 0;

            return {
                ...vehicle,
                company: {
                    ...vehicle.company,
                    avgRating,
                    reviewCount: reviews.length
                }
            };
        });

        res.json(vehiclesWithRatings);
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
        fylke,
        kommune,
        dailyKmsAllowed,
        additionalPricePerKm,
        rentWithDriver,
        priceWithDriver,
        priceWithoutDriver,
    } = req.body;

    try {
        const vehicle = await prisma.vehicle.create({
            data: {
                companyId: req.user.companyId,
                type: type as any,
                make,
                model,
                year: year ? parseInt(year) : undefined,
                registrationNumber,
                capacityKg: parseFloat(capacityKg),
                volumeM3: volumeM3 ? parseFloat(volumeM3) : undefined,
                hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
                dailyRate: dailyRate ? parseFloat(dailyRate) : undefined,
                fylke,
                kommune,
                dailyKmsAllowed: dailyKmsAllowed ? parseFloat(dailyKmsAllowed) : undefined,
                additionalPricePerKm: additionalPricePerKm ? parseFloat(additionalPricePerKm) : undefined,
                rentWithDriver: !!rentWithDriver,
                priceWithDriver: priceWithDriver ? parseFloat(priceWithDriver) : undefined,
                priceWithoutDriver: priceWithoutDriver ? parseFloat(priceWithoutDriver) : undefined,
                status: VehicleStatus.AVAILABLE,
            },
        });

        res.status(201).json(vehicle);
    } catch (error: any) {
        console.error('Create Vehicle Error:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Registration number already exists' });
        }
        res.status(500).json({
            message: 'Error creating vehicle',
            details: error.message,
            code: error.code
        });
    }
});

// 4. Update a vehicle
router.patch('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?.companyId) {
        return res.status(403).json({ message: 'User not associated with a company' });
    }

    const { id } = req.params;
    const body = req.body;

    try {
        // Ensure the vehicle belongs to the user's company
        const existingVehicle = await prisma.vehicle.findFirst({
            where: { id: id as string, companyId: req.user.companyId as string },
        });

        if (!existingVehicle) {
            return res.status(404).json({ message: 'Vehicle not found or unauthorized' });
        }

        // Parse numeric fields for Prisma
        const updateData: any = { ...body };
        if (updateData.capacityKg) updateData.capacityKg = parseFloat(updateData.capacityKg);
        if (updateData.dailyRate) updateData.dailyRate = parseFloat(updateData.dailyRate);
        if (updateData.hourlyRate) updateData.hourlyRate = parseFloat(updateData.hourlyRate);
        if (updateData.volumeM3) updateData.volumeM3 = parseFloat(updateData.volumeM3);
        if (updateData.year) updateData.year = parseInt(updateData.year);
        if (updateData.dailyKmsAllowed) updateData.dailyKmsAllowed = parseFloat(updateData.dailyKmsAllowed);
        if (updateData.additionalPricePerKm) updateData.additionalPricePerKm = parseFloat(updateData.additionalPricePerKm);
        if (updateData.priceWithDriver) updateData.priceWithDriver = parseFloat(updateData.priceWithDriver);
        if (updateData.priceWithoutDriver) updateData.priceWithoutDriver = parseFloat(updateData.priceWithoutDriver);
        if (updateData.rentWithDriver !== undefined) updateData.rentWithDriver = !!updateData.rentWithDriver;

        const updatedVehicle = await prisma.vehicle.update({
            where: { id: id as string },
            data: updateData,
        });

        res.json(updatedVehicle);
    } catch (error) {
        res.status(500).json({ message: 'Error updating vehicle' });
    }
});

// 5. Block dates for a vehicle
router.post('/:id/block-dates', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?.companyId) {
        return res.status(403).json({ message: 'User not associated with a company' });
    }

    const { id } = req.params;
    const { startDate, endDate, reason } = req.body;

    try {
        const vehicle = await prisma.vehicle.findFirst({
            where: { id: id as string, companyId: req.user.companyId as string },
        });

        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found or unauthorized' });
        }

        const blockedPeriod = await prisma.vehicleBlockedPeriod.create({
            data: {
                vehicleId: id as string,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
            },
        });

        res.status(201).json(blockedPeriod);
    } catch (error) {
        res.status(500).json({ message: 'Error blocking vehicle dates' });
    }
});

// 6. Get blocked dates for a vehicle
router.get('/:id/blocked-dates', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    try {
        const blockedPeriods = await prisma.vehicleBlockedPeriod.findMany({
            where: { vehicleId: id as string },
            orderBy: { startDate: 'asc' },
        });

        res.json(blockedPeriods);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching blocked periods' });
    }
});

// 7. Delete a blocked period
router.delete('/blocked-dates/:blockId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?.companyId) {
        return res.status(403).json({ message: 'User not associated with a company' });
    }

    const { blockId } = req.params;

    try {
        const blockedPeriod = await prisma.vehicleBlockedPeriod.findUnique({
            where: { id: blockId as string },
            include: { vehicle: true },
        });

        if (!blockedPeriod) {
            return res.status(404).json({ message: 'Blocked period not found' });
        }

        if (blockedPeriod.vehicle.companyId !== req.user.companyId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await prisma.vehicleBlockedPeriod.delete({
            where: { id: blockId as string },
        });

        res.json({ message: 'Blocked period removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing blocked period' });
    }
});

export default router;
