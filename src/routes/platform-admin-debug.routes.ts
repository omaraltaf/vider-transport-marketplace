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

export default router;