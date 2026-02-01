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

// --- Company Management ---

// List companies
router.get('/companies', authenticate, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const status = req.query.status as string;
        const search = req.query.search as string;

        const companies = await prisma.company.findMany({
            where: {
                AND: [
                    status ? { status: status as any } : {},
                    search ? {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { organizationNumber: { contains: search, mode: 'insensitive' } },
                        ],
                    } : {},
                ],
            },
            include: {
                _count: {
                    select: { users: true, vehicles: true, shipments: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: companies });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to list companies' });
    }
});

// Create company
router.post('/companies', authenticate, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, organizationNumber, businessAddress, city, postalCode, fylke, kommune } = req.body;
        const company = await prisma.company.create({
            data: {
                name,
                organizationNumber,
                businessAddress,
                city,
                postalCode,
                fylke,
                kommune,
                status: 'ACTIVE',
                verified: true,
                verifiedAt: new Date(),
            }
        });
        res.status(201).json({ success: true, data: company });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Failed to create company' });
    }
});

// Update company
router.patch('/companies/:id', authenticate, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const company = await prisma.company.update({
            where: { id },
            data: req.body
        });
        res.json({ success: true, data: company });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to update company' });
    }
});

// Update company status
router.patch('/companies/:id/status', authenticate, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { status } = req.body;
        const company = await prisma.company.update({
            where: { id },
            data: { status }
        });
        res.json({ success: true, data: company });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to update company status' });
    }
});

// Delete company
router.delete('/companies/:id', authenticate, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        // Check for dependencies (simplified: Prisma will throw if foreign keys exist)
        await prisma.company.delete({ where: { id } });
        res.json({ success: true, message: 'Company deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to delete company. Ensure it has no active users or data.' });
    }
});

// --- Vehicle Management ---

// List all vehicles
router.get('/vehicles', authenticate, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const status = req.query.status as string;
        const type = req.query.type as string;
        const search = req.query.search as string;

        const vehicles = await prisma.vehicle.findMany({
            where: {
                AND: [
                    status ? { status: status as any } : {},
                    type ? { type: type as any } : {},
                    search ? {
                        OR: [
                            { make: { contains: search, mode: 'insensitive' } },
                            { model: { contains: search, mode: 'insensitive' } },
                            { registrationNumber: { contains: search, mode: 'insensitive' } },
                        ],
                    } : {},
                ],
            },
            include: {
                company: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: vehicles });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to list vehicles' });
    }
});

// Create vehicle
router.post('/vehicles', authenticate, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const vehicle = await prisma.vehicle.create({
            data: req.body
        });
        res.status(201).json({ success: true, data: vehicle });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to create vehicle' });
    }
});

// Update vehicle
router.patch('/vehicles/:id', authenticate, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const vehicle = await prisma.vehicle.update({
            where: { id },
            data: req.body
        });
        res.json({ success: true, data: vehicle });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to update vehicle' });
    }
});

// Delete vehicle
router.delete('/vehicles/:id', authenticate, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        await prisma.vehicle.delete({ where: { id } });
        res.json({ success: true, message: 'Vehicle deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to delete vehicle.' });
    }
});

export default router;
