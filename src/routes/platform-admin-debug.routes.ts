import { Router } from 'express';

const router = Router();

// NO AUTHENTICATION for debug routes - they provide fallback data

// Debug endpoint to test if platform admin routes are working
router.get('/debug/test', (req, res) => {
  res.json({
    message: 'Platform admin routes are working',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
});

// Debug endpoint to check authentication
router.get('/debug/auth', (req, res) => {
  res.json({
    authenticated: !!req.user,
    user: req.user ? {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    } : null,
    headers: {
      authorization: req.headers.authorization ? 'Present' : 'Missing'
    }
  });
});

// Fallback endpoints for missing routes
router.get('/overview/metrics', (req, res) => {
  console.log('DEBUG: Overview metrics endpoint hit');
  res.json({
    users: { total: 1240, active: 890, new: 45, growth: 12.5 },
    companies: { total: 156, active: 142, new: 8, growth: 8.2 },
    revenue: { total: 2500000, monthly: 450000, growth: 15.3, commission: 125000 },
    system: { uptime: 99.8, responseTime: 145, errorRate: 0.02, activeConnections: 1250 }
  });
});

router.get('/notifications/global', (req, res) => {
  console.log('DEBUG: Global notifications endpoint hit');
  res.json({
    notifications: [
      {
        id: 'system-1',
        type: 'warning',
        title: 'System Alert',
        message: 'High memory usage detected on server cluster',
        timestamp: new Date(Date.now() - 1000 * 60 * 10),
        read: false,
        source: 'System Administration'
      }
    ]
  });
});

router.get('/cross-panel/data', (req, res) => {
  console.log('DEBUG: Cross-panel data endpoint hit');
  res.json({
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
  });
});

router.get('/system/alerts', (req, res) => {
  console.log('DEBUG: System alerts endpoint hit');
  res.json({
    alerts: [
      {
        id: 'alert-1',
        type: 'warning',
        title: 'High Memory Usage',
        message: 'Server memory usage is above 85%',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        resolved: false
      }
    ]
  });
});

router.get('/overview/activity', (req, res) => {
  console.log('DEBUG: Overview activity endpoint hit');
  res.json({
    activities: [
      {
        id: '1',
        type: 'user_registration',
        description: 'New user registered from Oslo',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        user: 'System'
      },
      {
        id: '2',
        type: 'company_signup',
        description: 'Bergen Logistics completed verification',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        user: 'Platform Admin'
      }
    ]
  });
});

// User management endpoints
router.get('/users', (req, res) => {
  console.log('DEBUG: Users endpoint hit with query:', req.query);
  res.json({
    users: [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        status: 'ACTIVE',
        role: 'USER',
        createdAt: new Date(),
        lastLoginDate: new Date()
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        status: 'ACTIVE',
        role: 'COMPANY_ADMIN',
        createdAt: new Date(),
        lastLoginDate: new Date()
      }
    ],
    total: 2,
    pagination: {
      limit: 50,
      offset: 0,
      total: 2
    }
  });
});

router.get('/users/companies/options', (req, res) => {
  console.log('DEBUG: User companies options endpoint hit');
  res.json({
    companies: [
      { id: '1', name: 'Oslo Transport AS' },
      { id: '2', name: 'Bergen Logistics' }
    ]
  });
});

// Content moderation endpoints
router.get('/moderation/statistics', (req, res) => {
  console.log('DEBUG: Moderation statistics endpoint hit');
  res.json({
    totalReports: 45,
    pendingReview: 12,
    resolvedToday: 8,
    flaggedContent: 23,
    suspendedUsers: 3,
    averageResponseTime: '2.5 hours'
  });
});

router.get('/moderation/stats', (req, res) => {
  console.log('DEBUG: Moderation stats endpoint hit');
  res.json({
    totalReports: 45,
    pendingReview: 12,
    resolvedToday: 8,
    flaggedContent: 23,
    suspendedUsers: 3,
    averageResponseTime: '2.5 hours'
  });
});

router.get('/moderation/fraud/stats', (req, res) => {
  console.log('DEBUG: Fraud stats endpoint hit');
  res.json({
    totalFraudCases: 12,
    activeCases: 3,
    resolvedCases: 9,
    suspiciousTransactions: 15,
    blockedUsers: 5,
    riskScore: 'Medium'
  });
});

router.get('/moderation/blacklist/stats', (req, res) => {
  console.log('DEBUG: Blacklist stats endpoint hit');
  res.json({
    totalBlacklisted: 28,
    emailBlacklist: 15,
    ipBlacklist: 8,
    domainBlacklist: 5,
    recentAdditions: 3,
    lastUpdated: new Date()
  });
});

// System health endpoints
router.get('/system/health', (req, res) => {
  console.log('DEBUG: System health endpoint hit');
  res.json({
    status: 'healthy',
    uptime: '99.8%',
    responseTime: 145,
    activeConnections: 1250,
    memoryUsage: '78%',
    diskSpace: '65%',
    lastCheck: new Date()
  });
});

router.get('/system/backup/jobs', (req, res) => {
  console.log('DEBUG: Backup jobs endpoint hit');
  res.json({
    jobs: [
      {
        id: 'backup-1',
        type: 'full',
        status: 'completed',
        startTime: new Date(Date.now() - 1000 * 60 * 60 * 2),
        endTime: new Date(Date.now() - 1000 * 60 * 60 * 1.5),
        size: '2.3 GB'
      },
      {
        id: 'backup-2',
        type: 'incremental',
        status: 'running',
        startTime: new Date(Date.now() - 1000 * 60 * 30),
        progress: '65%'
      }
    ]
  });
});

// Audit logs endpoints
router.get('/audit/logs', (req, res) => {
  console.log('DEBUG: Audit logs endpoint hit');
  res.json({
    logs: [
      {
        id: 'audit-1',
        action: 'USER_SUSPENDED',
        adminId: 'admin-1',
        targetId: 'user-123',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        details: 'User suspended for policy violation'
      },
      {
        id: 'audit-2',
        action: 'COMPANY_VERIFIED',
        adminId: 'admin-1',
        targetId: 'company-456',
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        details: 'Company verification completed'
      }
    ],
    total: 2,
    pagination: {
      page: 1,
      limit: 50,
      total: 2
    }
  });
});

// Platform configuration audit logs
router.get('/config/audit-logs', (req, res) => {
  console.log('DEBUG: Config audit logs endpoint hit');
  res.json({
    logs: [
      {
        id: 'config-1',
        action: 'FEATURE_TOGGLE',
        feature: 'hourly-bookings',
        oldValue: false,
        newValue: true,
        adminId: 'admin-1',
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        reason: 'Enable hourly bookings for pilot program'
      },
      {
        id: 'config-2',
        action: 'COMMISSION_RATE_UPDATE',
        oldValue: '5%',
        newValue: '4.5%',
        adminId: 'admin-1',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        reason: 'Reduce commission rate for Q1 promotion'
      }
    ],
    total: 2
  });
});

export default router;