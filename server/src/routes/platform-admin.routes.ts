import { Router, Response } from 'express';
import { authenticate, requirePlatformAdmin, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import prisma from '../config/database.js';
import { UserStatus } from '@prisma/client';

const router = Router();

// Get user statistics
router.get('/users/stats', authenticate, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const stats = await prisma.user.groupBy({
            by: ['status'],
            _count: {
                _all: true,
            },
        });

        const byStatus = {
            ACTIVE: 0,
            SUSPENDED: 0,
            PENDING_VERIFICATION: 0,
        };

        stats.forEach((stat) => {
            if (stat.status in byStatus) {
                byStatus[stat.status as keyof typeof byStatus] = stat._count._all;
            }
        });

        const totalUsers = await prisma.user.count();
        const activeToday = await prisma.user.count({
            where: {
                updatedAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                },
            },
        });

        // Financial Stats (Platform GMV and Revenue)
        const completedBookings = await prisma.booking.findMany({
            where: { status: 'COMPLETED' },
            select: {
                totalAmount: true,
                platformFee: true,
                subtotal: true,
                tax: true
            }
        });

        const totalGMV = completedBookings.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
        const platformRevenue = completedBookings.reduce((acc, b) => acc + (b.platformFee || 0), 0);
        const totalCompanies = await prisma.company.count();
        const totalVehicles = await prisma.vehicle.count();
        const totalShipments = await prisma.shipment.count();

        res.json({
            success: true,
            data: {
                totalUsers,
                activeToday,
                byStatus,
                verifiedRate: totalUsers > 0 ? (byStatus.ACTIVE / totalUsers) * 100 : 0,
                financials: {
                    totalGMV,
                    platformRevenue,
                    totalCompanies,
                    totalVehicles,
                    totalShipments
                }
            },
        });
    } catch (error: any) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch user statistics' });
    }
});

// List users with filtering
router.get('/users', authenticate, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { status, role, search } = req.query;

        const users = await prisma.user.findMany({
            where: {
                AND: [
                    status ? { status: status as UserStatus } : {},
                    role ? { role: role as any } : {},
                    search ? {
                        OR: [
                            { email: { contains: search as string, mode: 'insensitive' } },
                            { firstName: { contains: search as string, mode: 'insensitive' } },
                            { lastName: { contains: search as string, mode: 'insensitive' } },
                        ],
                    } : {},
                ],
            },
            include: {
                company: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.json({ success: true, data: users });
    } catch (error: any) {
        console.error('Error listing users:', error);
        res.status(500).json({ success: false, error: 'Failed to list users' });
    }
});

// Update user status
router.patch('/users/:id/status', authenticate, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!Object.values(UserStatus).includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    try {
        const updateData: any = {
            status,
        };

        if (status === UserStatus.ACTIVE) {
            updateData.emailVerified = true;
        }

        if (status === UserStatus.SUSPENDED) {
            updateData.suspendedAt = new Date();
            updateData.suspendedBy = req.user?.email || 'System';
            updateData.suspensionReason = reason || 'No reason provided';
        } else {
            updateData.suspendedAt = null;
            updateData.suspendedBy = null;
            updateData.suspensionReason = null;
        }

        const user = await prisma.user.update({
            where: { id: id as string },
            data: updateData,
        });

        res.json({ success: true, data: user });
    } catch (error: any) {
        console.error('Error updating user status:', error);
        res.status(500).json({ success: false, error: 'Failed to update user status' });
    }
});

// Bulk update user status
router.post('/users/bulk-status', authenticate, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { userIds, status, reason } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, error: 'User IDs are required' });
    }

    if (!Object.values(UserStatus).includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    try {
        const updateData: any = {
            status,
        };

        if (status === UserStatus.ACTIVE) {
            updateData.emailVerified = true;
        }

        if (status === UserStatus.SUSPENDED) {
            updateData.suspendedAt = new Date();
            updateData.suspendedBy = req.user?.email || 'System';
            updateData.suspensionReason = reason || 'Bulk suspension';
        } else {
            updateData.suspendedAt = null;
            updateData.suspendedBy = null;
            updateData.suspensionReason = null;
        }

        const result = await prisma.user.updateMany({
            where: {
                id: { in: userIds },
            },
            data: updateData,
        });

        res.json({
            success: true,
            data: {
                updatedCount: result.count,
            },
        });
    } catch (error: any) {
        console.error('Error in bulk status update:', error);
        res.status(500).json({ success: false, error: 'Failed to perform bulk update' });
    }
});

export default router;
