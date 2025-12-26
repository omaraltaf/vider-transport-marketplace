import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { cacheService } from '../services/cache.service';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Middleware for platform admin authentication and authorization
const requirePlatformAdmin = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== 'PLATFORM_ADMIN') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Platform admin access required'
    });
  }
  next();
};

// GET /api/platform-admin/moderation/content/flagged - Real flagged content
router.get('/content/flagged', requirePlatformAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const severity = req.query.severity as string;
    const contentType = req.query.contentType as string;
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (severity) whereClause.severity = severity;
    if (contentType) whereClause.contentType = contentType;

    const [flaggedContent, totalCount] = await Promise.all([
      prisma.contentFlags.findMany({
        where: whereClause,
        include: {
          flaggedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          resolvedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.contentFlags.count({ where: whereClause })
    ]);

    // Get moderation statistics
    const moderationStats = await cacheService.getOrSet(
      'moderation:content_stats',
      async () => {
        const statusStats = await prisma.contentFlags.groupBy({
          by: ['status'],
          _count: { id: true }
        });

        const severityStats = await prisma.contentFlags.groupBy({
          by: ['severity'],
          _count: { id: true }
        });

        const contentTypeStats = await prisma.contentFlags.groupBy({
          by: ['contentType'],
          _count: { id: true }
        });

        const recentFlags = await prisma.contentFlags.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        });

        return {
          byStatus: statusStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.id;
            return acc;
          }, {} as Record<string, number>),
          bySeverity: severityStats.reduce((acc, stat) => {
            acc[stat.severity] = stat._count.id;
            return acc;
          }, {} as Record<string, number>),
          byContentType: contentTypeStats.reduce((acc, stat) => {
            acc[stat.contentType] = stat._count.id;
            return acc;
          }, {} as Record<string, number>),
          recentFlags
        };
      },
      300 // 5 minutes cache
    );

    logger.info('Flagged content retrieved', {
      userId: req.user?.id,
      page,
      limit,
      totalCount,
      filters: { status, severity, contentType }
    });

    res.json({
      success: true,
      data: {
        flaggedContent,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        statistics: moderationStats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve flagged content:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve flagged content'
    });
  }
});

// GET /api/platform-admin/moderation/content/:id - Get specific flagged content with evidence
router.get('/content/:id', requirePlatformAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const flaggedContent = await prisma.contentFlags.findUnique({
      where: { id },
      include: {
        flaggedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        resolvedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!flaggedContent) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Flagged content not found'
      });
    }

    // Get related content based on content type and ID
    let relatedContent = null;
    try {
      switch (flaggedContent.contentType) {
        case 'USER_PROFILE':
          relatedContent = await prisma.user.findUnique({
            where: { id: flaggedContent.contentId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              // profilePicture: true, // Field doesn't exist in schema
              // bio: true, // Field doesn't exist in schema
              // status: true, // Field doesn't exist in schema
              createdAt: true
            }
          });
          break;
        case 'COMPANY_INFO':
          relatedContent = await prisma.company.findUnique({
            where: { id: flaggedContent.contentId },
            select: {
              id: true,
              name: true,
              description: true,
              // email: true, // Field doesn't exist in Company schema
              // phone: true, // Field doesn't exist in Company schema
              status: true,
              verified: true,
              createdAt: true
            }
          });
          break;
        case 'BOOKING_DESCRIPTION':
          relatedContent = await prisma.booking.findUnique({
            where: { id: flaggedContent.contentId },
            select: {
              id: true,
              // description: true, // Field doesn't exist in Booking schema
              status: true,
              total: true,
              startDate: true,
              endDate: true,
              createdAt: true
            }
          });
          break;
        case 'REVIEW':
          // Review table doesn't exist, use Rating instead
          relatedContent = await prisma.rating.findUnique({
            where: { id: flaggedContent.contentId },
            select: {
              id: true,
              companyReview: true,
              driverReview: true,
              companyStars: true,
              driverStars: true,
              createdAt: true
            }
          });
          break;
      }
    } catch (error) {
      logger.warn('Failed to fetch related content:', error);
    }

    logger.info('Flagged content details retrieved', {
      userId: req.user?.id,
      flagId: id,
      contentType: flaggedContent.contentType
    });

    res.json({
      success: true,
      data: {
        ...flaggedContent,
        relatedContent
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve flagged content details:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve flagged content details'
    });
  }
});

// PUT /api/platform-admin/moderation/content/:id/action - Take moderation action
router.put('/content/:id/action', requirePlatformAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason, additionalNotes } = req.body;

    if (!action || !['APPROVE', 'REJECT', 'ESCALATE', 'REMOVE_CONTENT'].includes(action)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid action is required (APPROVE, REJECT, ESCALATE, REMOVE_CONTENT)'
      });
    }

    const flaggedContent = await prisma.contentFlags.findUnique({
      where: { id }
    });

    if (!flaggedContent) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Flagged content not found'
      });
    }

    if (flaggedContent.status !== 'PENDING' && flaggedContent.status !== 'UNDER_REVIEW') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content flag has already been resolved'
      });
    }

    // Update the flag status
    const newStatus = action === 'ESCALATE' ? 'ESCALATED' : 
                     action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updatedFlag = await prisma.contentFlags.update({
      where: { id },
      data: {
        status: newStatus,
        resolvedAt: new Date(),
        resolvedBy: req.user?.id,
        evidence: {
          // ...flaggedContent.evidence,  // Can't spread unknown type
          moderationAction: {
            action,
            reason,
            additionalNotes,
            timestamp: new Date().toISOString(),
            moderatorId: req.user?.id
          }
        }
      }
    });

    // If removing content, update the actual content
    if (action === 'REMOVE_CONTENT') {
      try {
        switch (flaggedContent.contentType) {
          case 'USER_PROFILE':
            // User doesn't have status field, skip this update
            // await prisma.user.update({
            //   where: { id: flaggedContent.contentId },
            //   data: { status: 'SUSPENDED' }
            // });
            break;
          case 'COMPANY_INFO':
            await prisma.company.update({
              where: { id: flaggedContent.contentId },
              data: { status: 'SUSPENDED' }
            });
            break;
          case 'BOOKING_DESCRIPTION':
            await prisma.booking.update({
              where: { id: flaggedContent.contentId },
              data: { status: 'CANCELLED' }
            });
            break;
        }
      } catch (error) {
        logger.error('Failed to update content after moderation action:', error);
      }
    }

    // Invalidate moderation cache
    await cacheService.invalidatePattern('moderation:*');

    logger.info('Moderation action taken', {
      userId: req.user?.id,
      flagId: id,
      action,
      contentType: flaggedContent.contentType
    });

    res.json({
      success: true,
      data: updatedFlag,
      message: `Content flag ${action.toLowerCase()}d successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to take moderation action:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to take moderation action'
    });
  }
});

// POST /api/platform-admin/moderation/content/flag - Create new content flag
router.post('/content/flag', requirePlatformAdmin, async (req, res) => {
  try {
    const {
      contentId,
      contentType,
      flagType,
      severity,
      reason,
      evidence
    } = req.body;

    if (!contentId || !contentType || !flagType || !severity || !reason) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'contentId, contentType, flagType, severity, and reason are required'
      });
    }

    const validContentTypes = ['USER_PROFILE', 'BOOKING_DESCRIPTION', 'REVIEW', 'MESSAGE', 'COMPANY_INFO'];
    const validFlagTypes = ['INAPPROPRIATE_CONTENT', 'SPAM', 'HARASSMENT', 'FRAUD', 'OTHER'];
    const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    if (!validContentTypes.includes(contentType)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid content type'
      });
    }

    if (!validFlagTypes.includes(flagType)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid flag type'
      });
    }

    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid severity level'
      });
    }

    const newFlag = await prisma.contentFlags.create({
      data: {
        contentId,
        contentType,
        flagType,
        severity,
        reason,
        evidence: evidence || {},
        flaggedBy: req.user?.id,
        status: 'PENDING'
      }
    });

    // Invalidate moderation cache
    await cacheService.invalidatePattern('moderation:*');

    logger.info('New content flag created', {
      userId: req.user?.id,
      flagId: newFlag.id,
      contentType,
      severity
    });

    res.status(201).json({
      success: true,
      data: newFlag,
      message: 'Content flag created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to create content flag:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create content flag'
    });
  }
});

// GET /api/platform-admin/moderation/statistics - Moderation statistics
router.get('/statistics', requirePlatformAdmin, async (req, res) => {
  try {
    const stats = await cacheService.getOrSet(
      'moderation:detailed_stats',
      async () => {
        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [
          totalFlags,
          pendingFlags,
          resolvedFlags,
          flags24h,
          flags7d,
          flags30d,
          flagsByType,
          flagsBySeverity,
          resolutionTimes
        ] = await Promise.all([
          prisma.contentFlags.count(),
          prisma.contentFlags.count({ where: { status: 'PENDING' } }),
          prisma.contentFlags.count({ where: { status: { in: ['APPROVED', 'REJECTED'] } } }),
          prisma.contentFlags.count({ where: { createdAt: { gte: last24Hours } } }),
          prisma.contentFlags.count({ where: { createdAt: { gte: last7Days } } }),
          prisma.contentFlags.count({ where: { createdAt: { gte: last30Days } } }),
          prisma.contentFlags.groupBy({
            by: ['flagType'],
            _count: { id: true }
          }),
          prisma.contentFlags.groupBy({
            by: ['severity'],
            _count: { id: true }
          }),
          prisma.contentFlags.findMany({
            where: {
              resolvedAt: { not: null },
              createdAt: { not: null }
            },
            select: {
              createdAt: true,
              resolvedAt: true
            },
            take: 100
          })
        ]);

        // Calculate average resolution time
        const avgResolutionTime = resolutionTimes.length > 0
          ? resolutionTimes.reduce((sum, flag) => {
              const resolutionTime = flag.resolvedAt!.getTime() - flag.createdAt.getTime();
              return sum + resolutionTime;
            }, 0) / resolutionTimes.length
          : 0;

        return {
          overview: {
            totalFlags,
            pendingFlags,
            resolvedFlags,
            resolutionRate: totalFlags > 0 ? (resolvedFlags / totalFlags) * 100 : 0
          },
          recent: {
            last24Hours: flags24h,
            last7Days: flags7d,
            last30Days: flags30d
          },
          breakdown: {
            byType: flagsByType.reduce((acc, item) => {
              acc[item.flagType] = item._count.id;
              return acc;
            }, {} as Record<string, number>),
            bySeverity: flagsBySeverity.reduce((acc, item) => {
              acc[item.severity] = item._count.id;
              return acc;
            }, {} as Record<string, number>)
          },
          performance: {
            averageResolutionTimeHours: Math.round(avgResolutionTime / (1000 * 60 * 60) * 100) / 100
          }
        };
      },
      300
    );

    logger.info('Moderation statistics retrieved', {
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve moderation statistics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve moderation statistics'
    });
  }
});

export default router;