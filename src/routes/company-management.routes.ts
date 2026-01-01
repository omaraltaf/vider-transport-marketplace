import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePlatformAdmin } from '../middleware/platform-admin.middleware';
import { getDatabaseClient } from '../config/database';

const router = Router();
const prisma = getDatabaseClient();

// Apply authentication and platform admin role requirement to all routes
router.use(authenticate);
router.use(requirePlatformAdmin);

/**
 * GET /api/platform-admin/companies
 * Get all companies with stats
 */
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      status = 'all',
      verified = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { organizationNumber: { contains: search as string } },
        { city: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (status !== 'all') {
      where.status = status;
    }

    if (verified !== 'all') {
      where.verified = verified === 'true';
    }

    // Get companies with user and listing counts
    const companies = await prisma.company.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy as string]: sortOrder as 'asc' | 'desc'
      },
      include: {
        users: {
          select: { id: true }
        },
        vehicleListings: {
          select: { id: true, status: true }
        },
        driverListings: {
          select: { id: true, status: true }
        },
        _count: {
          select: {
            bookingsAsProvider: true,
            bookingsAsRenter: true
          }
        }
      }
    });

    // Transform data to include counts
    const companiesWithStats = companies.map(company => ({
      ...company,
      userCount: company.users.length,
      vehicleCount: company.vehicleListings.length,
      driverCount: company.driverListings.length,
      activeListings: company.vehicleListings.filter(v => v.status === 'ACTIVE').length +
                     company.driverListings.filter(d => d.status === 'ACTIVE').length,
      totalBookings: company._count.bookingsAsProvider + company._count.bookingsAsRenter,
      users: undefined, // Remove detailed user data
      vehicleListings: undefined,
      driverListings: undefined,
      _count: undefined
    }));

    // Get total count for pagination
    const totalCount = await prisma.company.count({ where });

    // Get stats
    const stats = await getCompanyStats();

    res.json({
      companies: companiesWithStats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / Number(limit))
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

/**
 * GET /api/platform-admin/companies/stats
 * Get company statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getCompanyStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching company stats:', error);
    res.status(500).json({ error: 'Failed to fetch company stats' });
  }
});

/**
 * GET /api/platform-admin/companies/:id
 * Get company details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true
          }
        },
        vehicleListings: {
          select: {
            id: true,
            title: true,
            vehicleType: true,
            status: true,
            hourlyRate: true,
            dailyRate: true,
            currency: true
          }
        },
        driverListings: {
          select: {
            id: true,
            name: true,
            licenseClass: true,
            status: true,
            hourlyRate: true,
            dailyRate: true,
            currency: true,
            verified: true
          }
        },
        bookingsAsProvider: {
          select: {
            id: true,
            status: true,
            total: true,
            currency: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(company);
  } catch (error) {
    console.error('Error fetching company details:', error);
    res.status(500).json({ error: 'Failed to fetch company details' });
  }
});

/**
 * PUT /api/platform-admin/companies/:id/verify
 * Verify a company
 */
router.put('/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user?.id;

    const company = await prisma.company.update({
      where: { id },
      data: {
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: adminId,
        verificationNotes: notes,
        status: 'ACTIVE'
      }
    });

    // TODO: Add audit logging for company verification

    res.json({ message: 'Company verified successfully', company });
  } catch (error) {
    console.error('Error verifying company:', error);
    res.status(500).json({ error: 'Failed to verify company' });
  }
});

/**
 * PUT /api/platform-admin/companies/:id/suspend
 * Suspend a company
 */
router.put('/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id;

    if (!reason) {
      return res.status(400).json({ error: 'Suspension reason is required' });
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspendedBy: adminId,
        suspensionReason: reason
      }
    });

    // Also suspend all active listings
    await prisma.vehicleListing.updateMany({
      where: { companyId: id, status: 'ACTIVE' },
      data: { status: 'SUSPENDED' }
    });

    await prisma.driverListing.updateMany({
      where: { companyId: id, status: 'ACTIVE' },
      data: { status: 'SUSPENDED' }
    });

    // TODO: Add audit logging for company suspension

    res.json({ message: 'Company suspended successfully', company });
  } catch (error) {
    console.error('Error suspending company:', error);
    res.status(500).json({ error: 'Failed to suspend company' });
  }
});

/**
 * PUT /api/platform-admin/companies/:id/reactivate
 * Reactivate a suspended company
 */
router.put('/:id/reactivate', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id;

    const company = await prisma.company.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
        suspendedBy: null,
        suspensionReason: null
      }
    });

    // Reactivate listings (admin can choose which ones to reactivate)
    await prisma.vehicleListing.updateMany({
      where: { companyId: id, status: 'SUSPENDED' },
      data: { status: 'ACTIVE' }
    });

    await prisma.driverListing.updateMany({
      where: { companyId: id, status: 'SUSPENDED' },
      data: { status: 'ACTIVE' }
    });

    // TODO: Add audit logging for company reactivation

    res.json({ message: 'Company reactivated successfully', company });
  } catch (error) {
    console.error('Error reactivating company:', error);
    res.status(500).json({ error: 'Failed to reactivate company' });
  }
});

/**
 * DELETE /api/platform-admin/companies/:id
 * Delete a company (soft delete - archive)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Instead of hard delete, we'll suspend and mark for deletion
    const company = await prisma.company.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspensionReason: `ARCHIVED: ${reason || 'No reason provided'}`
      }
    });

    // Suspend all listings
    await prisma.vehicleListing.updateMany({
      where: { companyId: id },
      data: { status: 'REMOVED' }
    });

    await prisma.driverListing.updateMany({
      where: { companyId: id },
      data: { status: 'REMOVED' }
    });

    // TODO: Add audit logging for company archival

    res.json({ message: 'Company archived successfully' });
  } catch (error) {
    console.error('Error archiving company:', error);
    res.status(500).json({ error: 'Failed to archive company' });
  }
});

/**
 * Helper function to get company statistics
 */
async function getCompanyStats() {
  const [
    totalCompanies,
    activeCompanies,
    pendingVerification,
    suspendedCompanies,
    verifiedCompanies,
    totalRevenue,
    avgRating
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { status: 'ACTIVE' } }),
    prisma.company.count({ where: { status: 'PENDING_VERIFICATION' } }),
    prisma.company.count({ where: { status: 'SUSPENDED' } }),
    prisma.company.count({ where: { verified: true } }),
    // Use actual booking revenue instead of company.totalRevenue field
    prisma.booking.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { total: true }
    }),
    prisma.company.aggregate({
      _avg: { aggregatedRating: true },
      where: { aggregatedRating: { not: null } }
    })
  ]);

  // Calculate monthly growth (mock for now)
  const monthlyGrowth = 15.3; // This would be calculated from actual data

  return {
    totalCompanies,
    activeCompanies,
    pendingVerification,
    suspendedCompanies,
    totalRevenue: totalRevenue._sum.total || 0, // Use booking total instead of totalRevenue
    averageRating: avgRating._avg.aggregatedRating || 0,
    monthlyGrowth,
    verificationRate: totalCompanies > 0 ? (verifiedCompanies / totalCompanies) * 100 : 0
  };
}

export default router;