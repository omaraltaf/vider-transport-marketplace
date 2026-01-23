import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import prisma from '../config/database.js';
import { BookingStatus, VehicleStatus, ShipmentStatus } from '@prisma/client';

const router = Router();

// 1. Create a booking request (either for a vehicle or a shipment)
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?.companyId) {
        return res.status(403).json({ message: 'User not associated with a company' });
    }

    const {
        providerId,
        vehicleId,
        shipmentId,
        startDate,
        endDate,
        totalAmount,
    } = req.body;

    try {
        const booking = await prisma.booking.create({
            data: {
                requesterId: req.user.companyId,
                providerId,
                vehicleId,
                shipmentId,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : undefined,
                totalAmount: parseFloat(totalAmount),
                status: BookingStatus.PENDING,
            },
        });

        res.status(201).json(booking);
    } catch (error) {
        res.status(500).json({ message: 'Error creating booking request' });
    }
});

// 2. Get my bookings (as requester or provider)
router.get('/my-bookings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?.companyId) {
        return res.status(403).json({ message: 'User not associated with a company' });
    }

    try {
        const bookings = await prisma.booking.findMany({
            where: {
                OR: [
                    { requesterId: req.user.companyId },
                    { providerId: req.user.companyId },
                ],
            },
            include: {
                requester: { select: { name: true } },
                provider: { select: { name: true } },
                vehicle: true,
                shipment: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

// 3. Update booking status (Accept/Reject)
router.patch('/:id/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?.companyId) {
        return res.status(403).json({ message: 'User not associated with a company' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(BookingStatus).includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        const booking = await prisma.booking.findUnique({
            where: { id },
        });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Only the provider can accept/reject pending bookings
        if (booking.providerId !== req.user.companyId) {
            return res.status(403).json({ message: 'Unauthorized to update this booking' });
        }

        const updatedBooking = await prisma.$transaction(async (tx) => {
            const updated = await tx.booking.update({
                where: { id },
                data: { status: status as BookingStatus },
            });

            // If accepted, update vehicle or shipment status
            if (status === BookingStatus.ACCEPTED) {
                if (updated.vehicleId) {
                    await tx.vehicle.update({
                        where: { id: updated.vehicleId },
                        data: { status: VehicleStatus.BOOKED },
                    });
                }
                if (updated.shipmentId) {
                    await tx.shipment.update({
                        where: { id: updated.shipmentId },
                        data: { status: ShipmentStatus.BOOKED },
                    });
                }
            }

            return updated;
        });

        res.json(updatedBooking);
    } catch (error) {
        res.status(500).json({ message: 'Error updating booking status' });
    }
});

export default router;
