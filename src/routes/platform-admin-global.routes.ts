import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { PlatformAdminUserService } from '../services/platform-admin-user.service';
import { AnalyticsService } from '../services/analytics.service';
import { SupportTicketService } from '../services/support-ticket.service';
import { AnnouncementService } from '../services/announcement.service';

const prisma = new PrismaClient();

const router = Router();

// Global search across all platform admin data
router.get('/search/global', async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;
    
    if (!query || typeof query !== 'string' || query.length < 2) {
      return res.json({ results: [] });
    }

    const results = [];

    // Search users
    const userService = new PlatformAdminUserService();
    const users = await userService.searchUsers({
      query: query,
      limit: 5
    });
    
    users.users.forEach((user: any) => {
      results.push({
        id: `user-${user.id}`,
        title: `${user.firstName} ${user.lastName}`,
        description: `User • ${user.email}`,
        type: 'user',
        section: 'management',
        url: `/platform-admin/users/${user.id}`,
        metadata: { userId: user.id }
      });
    });

    // Search support tickets
    const ticketService = SupportTicketService.getInstance();
    const ticketsResult = await ticketService.getTickets({}, { limit: 50, offset: 0 });
    
    // Filter tickets by query
    const filteredTickets = ticketsResult.tickets.filter((ticket: any) => 
      ticket.subject.toLowerCase().includes(query.toLowerCase()) ||
      ticket.description.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
    
    filteredTickets.forEach((ticket: any) => {
      results.push({
        id: `ticket-${ticket.id}`,
        title: ticket.subject,
        description: `Support Ticket • ${ticket.status}`,
        type: 'ticket',
        section: 'communication',
        url: `/platform-admin/communication/tickets/${ticket.id}`,
        metadata: { ticketId: ticket.id }
      });
    });

    // Search announcements
    const announcementService = AnnouncementService.getInstance();
    const announcements = await announcementService.getAnnouncements({}, 50);
    
    // Filter announcements by query
    const filteredAnnouncements = announcements.filter((announcement: any) => 
      announcement.title.toLowerCase().includes(query.toLowerCase()) ||
      announcement.content.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
    
    filteredAnnouncements.forEach((announcement: any) => {
      results.push({
        id: `announcement-${announcement.id}`,
        title: announcement.title,
        description: `Announcement • ${announcement.type}`,
        type: 'announcement',
        section: 'communication',
        url: `/platform-admin/communication/announcements/${announcement.id}`,
        metadata: { announcementId: announcement.id }
      });
    });

    // Limit total results
    const limitedResults = results.slice(0, parseInt(limit as string));

    res.json({ results: limitedResults });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ error: 'Failed to perform global search' });
  }
});

// Global notifications
router.get('/notifications/global', async (req, res) => {
  try {
    // Return mock notifications for now until services are fully implemented
    const notifications = [
      {
        id: 'system-1',
        type: 'warning',
        title: 'System Alert',
        message: 'High memory usage detected on server cluster',
        timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
        read: false,
        source: 'System Administration'
      },
      {
        id: 'ticket-1',
        type: 'error',
        title: 'Urgent Support Ticket',
        message: 'Payment processing issue - Customer unable to complete booking',
        timestamp: new Date(Date.now() - 1000 * 60 * 25), // 25 minutes ago
        read: false,
        source: 'Support Center'
      },
      {
        id: 'user-1',
        type: 'info',
        title: 'New User Registration',
        message: 'John Doe registered as company admin',
        timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
        read: false,
        source: 'User Management'
      }
    ];

    res.json({ notifications });
  } catch (error) {
    console.error('Global notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch global notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    // In a real implementation, you would update the notification status in the database
    // For now, we'll just return success
    
    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Cross-panel data for dashboard
router.get('/cross-panel/data', async (req, res) => {
  try {
    // Return mock cross-panel data for now until services are fully implemented
    const crossPanelData = {
      quickStats: {
        activeUsers: 1240,
        pendingTickets: 8,
        systemAlerts: 2,
        revenueToday: 45000
      },
      systemStatus: {
        overall: 'healthy',
        services: {
          database: 'up',
          redis: 'degraded',
          api: 'up',
          payments: 'up'
        },
        lastUpdate: new Date()
      }
    };

    res.json(crossPanelData);
  } catch (error) {
    console.error('Cross-panel data error:', error);
    res.status(500).json({ error: 'Failed to fetch cross-panel data' });
  }
});

// Global export functionality
router.post('/export/global', async (req, res) => {
  try {
    const { format = 'csv', section = 'overview' } = req.query;
    
    let data: any[] = [];
    let filename = `platform-admin-${section}-${new Date().toISOString().split('T')[0]}`;

    // Get data based on section
    switch (section) {
      case 'users':
      case 'management':
        const userMgmtService = new PlatformAdminUserService();
        const users = await userMgmtService.searchUsers({ limit: 10000 });
        data = users.users.map((user: any) => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          status: user.status,
          createdAt: user.createdAt,
          lastLoginDate: user.lastLoginDate
        }));
        break;
        
      case 'tickets':
      case 'communication':
        const ticketService = SupportTicketService.getInstance();
        const ticketsResult = await ticketService.getTickets({}, { limit: 10000, offset: 0 });
        data = ticketsResult.tickets.map((ticket: any) => ({
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          userEmail: ticket.userEmail,
          createdAt: ticket.createdAt
        }));
        break;
        
      default:
        // Overview data - use real data from database
        const overviewUserService = new PlatformAdminUserService();
        const userStats = await overviewUserService.getUserStatistics();
        
        const [totalBookings, totalRevenue] = await Promise.all([
          prisma.booking.count(),
          prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { status: 'COMPLETED' }
          })
        ]);
        
        data = [{
          totalUsers: userStats.totalUsers,
          activeUsers: userStats.activeUsers,
          totalBookings: totalBookings,
          totalRevenue: totalRevenue._sum.amount || 0,
          timestamp: new Date()
        }];
    }

    // Format data based on requested format
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json(data);
    } else if (format === 'csv') {
      // Simple CSV conversion
      if (data.length > 0) {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).join(','));
        const csv = [headers, ...rows].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(csv);
      } else {
        res.status(404).json({ error: 'No data to export' });
      }
    } else {
      res.status(400).json({ error: 'Unsupported export format' });
    }
  } catch (error) {
    console.error('Global export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Overview metrics endpoint
router.get('/overview/metrics', async (req, res) => {
  try {
    const userService = new PlatformAdminUserService();
    const range = req.query.range as string || '30d';
    
    console.log('Overview metrics requested for range:', range);

    // Calculate date range based on query parameter
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get user statistics (this method exists)
    const userStats = await userService.getUserStatistics();

    // Get real company statistics from database
    const [
      totalCompanies,
      activeCompanies,
      pendingVerification,
      suspendedCompanies,
      verifiedCompanies,
      totalRevenueData,
      avgRating
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { status: 'ACTIVE' } }),
      prisma.company.count({ where: { status: 'PENDING_VERIFICATION' } }),
      prisma.company.count({ where: { status: 'SUSPENDED' } }),
      prisma.company.count({ where: { verified: true } }),
      prisma.company.aggregate({
        _sum: { totalRevenue: true }
      }),
      prisma.company.aggregate({
        _avg: { aggregatedRating: true },
        where: { aggregatedRating: { not: null } }
      })
    ]);

    // Get transaction data for the specified date range
    const [
      totalTransactions,
      rangeTransactions,
      totalTransactionRevenue,
      rangeTransactionRevenue
    ] = await Promise.all([
      prisma.transaction.count({ where: { status: 'COMPLETED' } }),
      prisma.transaction.count({ 
        where: { 
          status: 'COMPLETED',
          createdAt: { gte: startDate }
        } 
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' }
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { 
          status: 'COMPLETED',
          createdAt: { gte: startDate }
        }
      })
    ]);

    // Calculate platform commission (5% of transaction revenue)
    const totalRevenue = totalTransactionRevenue._sum.amount || 0;
    const rangeRevenue = rangeTransactionRevenue._sum.amount || 0;
    const platformCommission = totalRevenue * 0.05; // 5% commission

    // Calculate growth rates (mock for now - would need historical data)
    const userGrowthRate = 12.5; // Mock - would calculate from historical data
    const companyGrowthRate = 8.2; // Mock - would calculate from historical data  
    const revenueGrowthRate = 15.3; // Mock - would calculate from historical data

    // Create metrics using real data filtered by date range
    const metrics = {
      users: {
        total: userStats.totalUsers,
        active: userStats.activeUsers,
        new: userStats.newUsersThisMonth,
        growth: userGrowthRate
      },
      companies: {
        total: totalCompanies,
        active: activeCompanies,
        new: pendingVerification, // New companies awaiting verification
        growth: companyGrowthRate
      },
      revenue: {
        total: totalRevenue,
        monthly: rangeRevenue, // Use range-specific revenue instead of monthly
        growth: revenueGrowthRate,
        commission: platformCommission
      },
      system: {
        uptime: 99.8, // Would come from monitoring service - keeping realistic value
        responseTime: 145, // Would come from monitoring service - keeping realistic value
        errorRate: 0.02, // Would come from monitoring service - keeping realistic value
        activeConnections: Math.floor(Math.random() * 500) + 1000 // Simulate realistic active connections
      },
      _debug: {
        range,
        startDate: startDate.toISOString(),
        rangeTransactions,
        rangeRevenue
      }
    };

    console.log('Returning metrics for range:', range, 'with revenue:', rangeRevenue);
    res.json(metrics);
  } catch (error) {
    console.error('Overview metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch overview metrics' });
  }
});

// Recent activity endpoint
router.get('/overview/activity', async (req, res) => {
  try {
    const range = req.query.range as string || '30d';
    console.log('Activity requested for range:', range);
    
    // Return mock activity data filtered by range
    const allActivities = [
      {
        id: '1',
        type: 'user_registration',
        description: 'New user registered from Oslo',
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        user: 'System'
      },
      {
        id: '2',
        type: 'company_signup',
        description: 'Bergen Logistics completed verification',
        timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
        user: 'Platform Admin'
      },
      {
        id: '3',
        type: 'payment',
        description: 'Payment processed: 2,450 kr',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      },
      {
        id: '4',
        type: 'user_registration',
        description: 'New driver registered from Bergen',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        user: 'System'
      },
      {
        id: '5',
        type: 'payment',
        description: 'Payment processed: 1,850 kr',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
      },
      {
        id: '6',
        type: 'company_signup',
        description: 'Trondheim Fleet AS registered',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        user: 'System'
      },
      {
        id: '7',
        type: 'system_event',
        description: 'System backup completed successfully',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      },
      {
        id: '8',
        type: 'payment',
        description: 'Payment processed: 3,200 kr',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
      }
    ];

    // Filter activities based on range
    let filteredActivities;
    switch (range) {
      case '7d':
        filteredActivities = allActivities.slice(0, 3); // Show fewer for 7 days
        break;
      case '90d':
        filteredActivities = allActivities; // Show all for 90 days
        break;
      case '30d':
      default:
        filteredActivities = allActivities.slice(0, 5); // Show moderate amount for 30 days
        break;
    }

    console.log(`Returning ${filteredActivities.length} activities for range: ${range}`);
    res.json({ activities: filteredActivities });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

// System alerts endpoint (temporary mock)
router.get('/system/alerts', async (req, res) => {
  try {
    // Return mock system alerts for now
    const alerts = [
      {
        id: 'alert-1',
        type: 'warning',
        title: 'High Memory Usage',
        message: 'Server memory usage is above 85%',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        resolved: false
      },
      {
        id: 'alert-2',
        type: 'info',
        title: 'Backup Completed',
        message: 'Daily backup completed successfully',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        resolved: true
      }
    ];

    res.json({ alerts });
  } catch (error) {
    console.error('System alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch system alerts' });
  }
});

export default router;