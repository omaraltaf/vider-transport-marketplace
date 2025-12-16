/**
 * User Management API Routes
 * Platform admin endpoints for user management operations
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { authenticate } from '../middleware/auth.middleware';
import { requirePlatformAdmin } from '../middleware/platform-admin.middleware';
import { platformAdminUserService } from '../services/platform-admin-user.service';
import { bulkUserOperationsService } from '../services/bulk-user-operations.service';
import { userActivityMonitoringService } from '../services/user-activity-monitoring.service';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication and platform admin authorization to all routes
router.use(authenticate);
router.use(requirePlatformAdmin);

/**
 * POST /api/platform-admin/users
 * Create new user with company assignment
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      email, 
      firstName, 
      lastName, 
      phone, 
      role, 
      companyId,
      permissions,
      driverLicense,
      vehicleTypes
    } = req.body;
    const createdBy = req.user?.userId || 'system';

    // Validate required fields
    if (!email || !firstName || !lastName || !role || !companyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, firstName, lastName, role, companyId'
      });
    }

    // Validate role
    const validRoles = ['CUSTOMER', 'DRIVER', 'COMPANY_ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email already exists'
      });
    }

    // Verify company exists and is active
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, status: true, verified: true }
    });

    if (!company) {
      return res.status(400).json({
        success: false,
        error: 'Company not found'
      });
    }

    if (company.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: 'Company is not active'
      });
    }

    // Role-specific validation
    if (role === 'COMPANY_ADMIN' && (!permissions || !Array.isArray(permissions))) {
      return res.status(400).json({
        success: false,
        error: 'Permissions array is required for Company Admin role'
      });
    }

    // Create user with temporary password (should be changed on first login)
    const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Map role to database enum - all non-admin users are COMPANY_USER in the database
    let dbRole: 'PLATFORM_ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_USER';
    switch (role) {
      case 'COMPANY_ADMIN':
        dbRole = 'COMPANY_ADMIN';
        break;
      case 'CUSTOMER':
      case 'DRIVER':
      default:
        dbRole = 'COMPANY_USER';
        break;
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        phone: phone || '',
        role: dbRole,
        companyId,
        passwordHash,
        emailVerified: true, // Auto-verify admin-created users
        verificationToken: null, // No verification needed for admin-created users
        isTemporaryPassword: true // Mark as temporary password requiring change on first login
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            organizationNumber: true,
            city: true,
            fylke: true
          }
        }
      }
    });

    // Log user creation
    await userActivityMonitoringService.logAdminAction({
      adminId: createdBy,
      adminName: req.user?.email || 'System',
      action: 'USER_CREATED',
      category: 'USER_MANAGEMENT',
      targetType: 'USER',
      targetId: newUser.id,
      changes: [
        {
          field: 'role',
          previousValue: null,
          newValue: role
        },
        {
          field: 'companyId',
          previousValue: null,
          newValue: companyId
        }
      ],
      reason: `New ${role} user created for company ${company.name}`,
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: new Date(),
      impact: 'MEDIUM'
    });

    // Return user data without sensitive information
    const responseUser = {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      phone: newUser.phone,
      role: role,
      companyId: newUser.companyId,
      company: newUser.company,
      emailVerified: newUser.emailVerified,
      createdAt: newUser.createdAt,
      tempPassword // Include temp password for admin to share with user
    };

    res.status(201).json({
      success: true,
      data: responseUser,
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user'
    });
  }
});

/**
 * POST /api/platform-admin/users/admins
 * Create new platform admin user
 */
router.post('/admins', async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, phone, permissions } = req.body;
    const createdBy = req.user?.userId || 'system'; // From auth middleware

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, firstName, lastName'
      });
    }

    // Validate permissions
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        error: 'Permissions array is required'
      });
    }

    const newAdmin = await platformAdminUserService.createPlatformAdmin(
      { email, firstName, lastName, phone },
      createdBy
    );

    // Log admin creation
    await userActivityMonitoringService.logAdminAction({
      adminId: createdBy,
      adminName: req.user?.email || 'System',
      action: 'ADMIN_CREATED',
      category: 'USER_MANAGEMENT',
      targetType: 'USER',
      targetId: newAdmin.id,
      changes: [
        {
          field: 'role',
          previousValue: null,
          newValue: 'PLATFORM_ADMIN'
        },
        {
          field: 'permissions',
          previousValue: [],
          newValue: permissions
        }
      ],
      reason: 'New platform admin created',
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: new Date(),
      impact: 'HIGH'
    });

    res.status(201).json({
      success: true,
      data: newAdmin,
      message: 'Platform admin created successfully'
    });

  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create admin'
    });
  }
});

/**
 * GET /api/platform-admin/users/companies/options
 * Get companies for user creation dropdown
 */
router.get('/companies/options', async (req: Request, res: Response) => {
  try {
    const { search, limit = '50' } = req.query;

    // Build where clause for search
    const where: any = {
      status: 'ACTIVE',
      verified: true
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { organizationNumber: { contains: search as string } },
        { city: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const companies = await prisma.company.findMany({
      where,
      take: parseInt(limit as string),
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        organizationNumber: true,
        city: true,
        fylke: true,
        status: true,
        verified: true
      }
    });

    const total = await prisma.company.count({ where });

    res.json({
      success: true,
      data: {
        companies,
        total
      }
    });

  } catch (error) {
    console.error('Error fetching company options:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch company options'
    });
  }
});

/**
 * GET /api/platform-admin/users
 * List users with advanced filtering and search
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      query,
      role,
      status,
      verificationStatus,
      kycStatus,
      companyId,
      hasFlags,
      flagType,
      riskScoreMin,
      riskScoreMax,
      registrationStart,
      registrationEnd,
      lastLoginStart,
      lastLoginEnd,
      sortBy,
      sortOrder,
      limit = '50',
      offset = '0'
    } = req.query;

    // Build filters object
    const filters: any = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    };

    if (query) filters.query = query as string;
    if (role) filters.role = role as string;
    if (status) filters.status = status as string;
    if (verificationStatus) filters.verificationStatus = verificationStatus as string;
    if (kycStatus) filters.kycStatus = kycStatus as string;
    if (companyId) filters.companyId = companyId as string;
    if (hasFlags !== undefined) filters.hasFlags = hasFlags === 'true';
    if (flagType) filters.flagType = flagType as string;

    if (riskScoreMin || riskScoreMax) {
      filters.riskScoreRange = {
        min: riskScoreMin ? parseFloat(riskScoreMin as string) : 0,
        max: riskScoreMax ? parseFloat(riskScoreMax as string) : 100
      };
    }

    if (registrationStart || registrationEnd) {
      filters.registrationDateRange = {
        start: registrationStart ? new Date(registrationStart as string) : new Date('2020-01-01'),
        end: registrationEnd ? new Date(registrationEnd as string) : new Date()
      };
    }

    if (lastLoginStart || lastLoginEnd) {
      filters.lastLoginRange = {
        start: lastLoginStart ? new Date(lastLoginStart as string) : new Date('2020-01-01'),
        end: lastLoginEnd ? new Date(lastLoginEnd as string) : new Date()
      };
    }

    const result = await platformAdminUserService.searchUsers(filters);

    res.json({
      success: true,
      data: result.users,
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: result.total > (filters.offset + filters.limit)
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users'
    });
  }
});

/**
 * GET /api/platform-admin/users/:id/details
 * Get detailed user information
 */
router.get('/:id/details', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await platformAdminUserService.getUserDetails(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get additional user data
    const [activity, behaviorAnalytics, engagementMetrics] = await Promise.all([
      userActivityMonitoringService.getUserActivity(id, { limit: 10 }),
      userActivityMonitoringService.getUserBehaviorAnalytics(id, 'WEEKLY'),
      userActivityMonitoringService.getUserEngagementMetrics(id)
    ]);

    res.json({
      success: true,
      data: {
        user,
        recentActivity: activity.activities,
        behaviorAnalytics: behaviorAnalytics[0], // Most recent week
        engagementMetrics: engagementMetrics[0] // Most recent month
      }
    });

  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user details'
    });
  }
});

/**
 * PUT /api/platform-admin/users/:id/status
 * Update user status
 */
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const updatedBy = req.user?.userId || 'system';

    // Validate status
    const validStatuses = ['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION', 'DEACTIVATED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Reason is required for status changes'
      });
    }

    const updatedUser = await platformAdminUserService.updateUserStatus(id, status, reason, updatedBy);

    // Log the status change
    await userActivityMonitoringService.logAdminAction({
      adminId: updatedBy,
      adminName: req.user?.email || 'System',
      action: 'USER_STATUS_CHANGED',
      category: 'USER_MANAGEMENT',
      targetType: 'USER',
      targetId: id,
      changes: [
        {
          field: 'status',
          previousValue: 'ACTIVE', // Would be fetched from previous state
          newValue: status
        }
      ],
      reason,
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: new Date(),
      impact: status === 'BANNED' ? 'HIGH' : 'MEDIUM'
    });

    res.json({
      success: true,
      data: updatedUser,
      message: `User status updated to ${status}`
    });

  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user status'
    });
  }
});

/**
 * GET /api/platform-admin/users/statistics
 * Get user statistics and metrics
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const statistics = await platformAdminUserService.getUserStatistics();

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user statistics'
    });
  }
});

/**
 * POST /api/platform-admin/users/:id/flag
 * Flag user for review
 */
router.post('/:id/flag', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, severity, reason, description } = req.body;
    const flaggedBy = req.user?.userId || 'system';

    // Validate required fields
    if (!type || !severity || !reason || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, severity, reason, description'
      });
    }

    // Validate flag type and severity
    const validTypes = ['SUSPICIOUS_ACTIVITY', 'POLICY_VIOLATION', 'FRAUD_RISK', 'MANUAL_REVIEW', 'SECURITY_CONCERN'];
    const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid flag type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
      });
    }

    const flag = await platformAdminUserService.flagUser(
      id,
      { type, severity, reason, description },
      flaggedBy
    );

    // Log the flagging action
    await userActivityMonitoringService.logAdminAction({
      adminId: flaggedBy,
      adminName: req.user?.email || 'System',
      action: 'USER_FLAGGED',
      category: 'USER_MANAGEMENT',
      targetType: 'USER',
      targetId: id,
      changes: [
        {
          field: 'flags',
          previousValue: 'N/A',
          newValue: `${type} (${severity})`
        }
      ],
      reason,
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: new Date(),
      impact: severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM'
    });

    res.status(201).json({
      success: true,
      data: flag,
      message: 'User flagged successfully'
    });

  } catch (error) {
    console.error('Error flagging user:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to flag user'
    });
  }
});

/**
 * GET /api/platform-admin/users/:id/activity
 * Get user activity log
 */
router.get('/:id/activity', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      category,
      startDate,
      endDate,
      limit = '50',
      offset = '0'
    } = req.query;

    const filters: any = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    if (category) filters.category = category as string;
    
    if (startDate || endDate) {
      filters.dateRange = {
        start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: endDate ? new Date(endDate as string) : new Date()
      };
    }

    const result = await platformAdminUserService.getUserActivity(id, filters);

    res.json({
      success: true,
      data: result.activities,
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: result.total > (filters.offset + filters.limit)
      }
    });

  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user activity'
    });
  }
});

/**
 * GET /api/platform-admin/users/suspicious-activity
 * Get users with suspicious activity
 */
router.get('/suspicious-activity', async (req: Request, res: Response) => {
  try {
    const suspiciousActivity = await userActivityMonitoringService.detectSuspiciousActivity();

    res.json({
      success: true,
      data: suspiciousActivity
    });

  } catch (error) {
    console.error('Error fetching suspicious activity:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch suspicious activity'
    });
  }
});

/**
 * POST /api/platform-admin/users/bulk-operations
 * Execute bulk operations on multiple users (alternative endpoint)
 */
router.post('/bulk-operations', async (req: Request, res: Response) => {
  try {
    const { type, targetUsers, parameters } = req.body;
    const executedBy = req.user?.userId || 'system';

    // Validate required fields
    if (!type || !targetUsers || !Array.isArray(targetUsers) || targetUsers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, targetUsers (array)'
      });
    }

    // Validate operation type
    const validOperations = ['STATUS_UPDATE', 'ROLE_ASSIGNMENT', 'PERMISSION_UPDATE', 'FLAG_USERS', 'SEND_NOTIFICATION'];
    if (!validOperations.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid operation. Must be one of: ${validOperations.join(', ')}`
      });
    }

    // Validate parameters based on operation type
    if (!parameters || typeof parameters !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Parameters object is required'
      });
    }

    const bulkOperation = await bulkUserOperationsService.executeBulkOperation(
      type,
      targetUsers,
      parameters,
      executedBy
    );

    // Log bulk operation initiation
    await userActivityMonitoringService.logAdminAction({
      adminId: executedBy,
      adminName: req.user?.email || 'System',
      action: 'BULK_OPERATION_INITIATED',
      category: 'USER_MANAGEMENT',
      targetType: 'USER',
      targetId: bulkOperation.id,
      changes: [
        {
          field: 'operation',
          previousValue: null,
          newValue: type
        },
        {
          field: 'targetCount',
          previousValue: 0,
          newValue: targetUsers.length
        }
      ],
      reason: `Bulk ${type} on ${targetUsers.length} users`,
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: new Date(),
      impact: targetUsers.length > 100 ? 'HIGH' : 'MEDIUM'
    });

    res.status(202).json({
      success: true,
      data: bulkOperation,
      message: 'Bulk operation initiated successfully'
    });

  } catch (error) {
    console.error('Error executing bulk operation:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute bulk operation'
    });
  }
});

/**
 * POST /api/platform-admin/users/bulk-update
 * Execute bulk operations on multiple users
 */
router.post('/bulk-update', async (req: Request, res: Response) => {
  try {
    const { operation, targetUsers, parameters } = req.body;
    const executedBy = req.user?.userId || 'system';

    // Validate required fields
    if (!operation || !targetUsers || !Array.isArray(targetUsers) || targetUsers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: operation, targetUsers (array)'
      });
    }

    // Validate operation type
    const validOperations = ['STATUS_UPDATE', 'ROLE_ASSIGNMENT', 'PERMISSION_UPDATE', 'FLAG_USERS', 'SEND_NOTIFICATION'];
    if (!validOperations.includes(operation)) {
      return res.status(400).json({
        success: false,
        error: `Invalid operation. Must be one of: ${validOperations.join(', ')}`
      });
    }

    // Validate parameters based on operation type
    if (!parameters || typeof parameters !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Parameters object is required'
      });
    }

    const bulkOperation = await bulkUserOperationsService.executeBulkOperation(
      operation,
      targetUsers,
      parameters,
      executedBy
    );

    // Log bulk operation initiation
    await userActivityMonitoringService.logAdminAction({
      adminId: executedBy,
      adminName: req.user?.email || 'System',
      action: 'BULK_OPERATION_INITIATED',
      category: 'USER_MANAGEMENT',
      targetType: 'USER',
      targetId: bulkOperation.id,
      changes: [
        {
          field: 'operation',
          previousValue: null,
          newValue: operation
        },
        {
          field: 'targetCount',
          previousValue: 0,
          newValue: targetUsers.length
        }
      ],
      reason: `Bulk ${operation} on ${targetUsers.length} users`,
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: new Date(),
      impact: targetUsers.length > 100 ? 'HIGH' : 'MEDIUM'
    });

    res.status(202).json({
      success: true,
      data: bulkOperation,
      message: 'Bulk operation initiated successfully'
    });

  } catch (error) {
    console.error('Error executing bulk operation:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute bulk operation'
    });
  }
});

/**
 * GET /api/platform-admin/users/bulk-operations/:id
 * Get bulk operation status
 */
router.get('/bulk-operations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const operation = await bulkUserOperationsService.getBulkOperationStatus(id);
    
    if (!operation) {
      return res.status(404).json({
        success: false,
        error: 'Bulk operation not found'
      });
    }

    res.json({
      success: true,
      data: operation
    });

  } catch (error) {
    console.error('Error fetching bulk operation status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch bulk operation status'
    });
  }
});

/**
 * POST /api/platform-admin/users/bulk-import
 * Import users from CSV/Excel data
 */
router.post('/bulk-import', async (req: Request, res: Response) => {
  try {
    const { userData, fileName } = req.body;
    const importedBy = req.user?.userId || 'system';

    // Validate required fields
    if (!userData || !Array.isArray(userData) || userData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'userData array is required and cannot be empty'
      });
    }

    if (!fileName) {
      return res.status(400).json({
        success: false,
        error: 'fileName is required'
      });
    }

    // Validate user data structure
    const requiredFields = ['email', 'firstName', 'lastName', 'role'];
    for (let i = 0; i < userData.length; i++) {
      const user = userData[i];
      for (const field of requiredFields) {
        if (!user[field]) {
          return res.status(400).json({
            success: false,
            error: `Missing required field '${field}' in row ${i + 1}`
          });
        }
      }
    }

    const importResult = await bulkUserOperationsService.importUsers(userData, importedBy, fileName);

    // Log import operation
    await userActivityMonitoringService.logAdminAction({
      adminId: importedBy,
      adminName: req.user?.email || 'System',
      action: 'USER_BULK_IMPORT',
      category: 'USER_MANAGEMENT',
      targetType: 'SYSTEM',
      targetId: importResult.id,
      changes: [
        {
          field: 'importedUsers',
          previousValue: 0,
          newValue: userData.length
        }
      ],
      reason: `Bulk import from ${fileName}`,
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: new Date(),
      impact: userData.length > 100 ? 'HIGH' : 'MEDIUM'
    });

    res.status(202).json({
      success: true,
      data: importResult,
      message: 'User import initiated successfully'
    });

  } catch (error) {
    console.error('Error importing users:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import users'
    });
  }
});

/**
 * PUT /api/platform-admin/users/:id/roles
 * Assign roles to user
 */
router.put('/:id/roles', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { roles, permissions } = req.body;
    const assignedBy = req.user?.userId || 'system';

    // Validate required fields
    if (!roles && !permissions) {
      return res.status(400).json({
        success: false,
        error: 'Either roles or permissions array is required'
      });
    }

    // Get user details first
    const user = await platformAdminUserService.getUserDetails(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Execute role/permission assignment
    const result = await bulkUserOperationsService.executeBulkOperation(
      'ROLE_ASSIGNMENT',
      [id],
      { roles: roles || [], permissions: permissions || [] },
      assignedBy
    );

    // Log role assignment
    await userActivityMonitoringService.logAdminAction({
      adminId: assignedBy,
      adminName: req.user?.email || 'System',
      action: 'USER_ROLES_ASSIGNED',
      category: 'USER_MANAGEMENT',
      targetType: 'USER',
      targetId: id,
      changes: [
        {
          field: 'roles',
          previousValue: user.role,
          newValue: roles || []
        },
        {
          field: 'permissions',
          previousValue: user.permissions,
          newValue: permissions || []
        }
      ],
      reason: 'Role and permission assignment',
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: new Date(),
      impact: 'MEDIUM'
    });

    res.json({
      success: true,
      data: result,
      message: 'Roles and permissions assigned successfully'
    });

  } catch (error) {
    console.error('Error assigning roles:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign roles'
    });
  }
});

/**
 * GET /api/platform-admin/users/export
 * Export user data
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const {
      userIds,
      role,
      status,
      includePersonalData = 'false',
      format = 'csv'
    } = req.query;
    const exportedBy = req.user?.userId || 'system';

    // Build filters
    const filters: any = {
      includePersonalData: includePersonalData === 'true'
    };

    if (userIds) {
      filters.userIds = (userIds as string).split(',');
    }
    if (role) filters.role = role as string;
    if (status) filters.status = status as string;

    const exportResult = await bulkUserOperationsService.exportUsers(filters, exportedBy);

    // Log export operation
    await userActivityMonitoringService.logAdminAction({
      adminId: exportedBy,
      adminName: req.user?.email || 'System',
      action: 'USER_DATA_EXPORTED',
      category: 'USER_MANAGEMENT',
      targetType: 'SYSTEM',
      targetId: 'export',
      changes: [
        {
          field: 'exportedRecords',
          previousValue: 0,
          newValue: exportResult.totalRecords
        },
        {
          field: 'includePersonalData',
          previousValue: false,
          newValue: filters.includePersonalData
        }
      ],
      reason: 'User data export',
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: new Date(),
      impact: filters.includePersonalData ? 'HIGH' : 'MEDIUM'
    });

    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);

    res.json({
      success: true,
      data: exportResult.data,
      filename: exportResult.filename,
      totalRecords: exportResult.totalRecords,
      message: 'User data exported successfully'
    });

  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export users'
    });
  }
});

/**
 * GET /api/platform-admin/users/roles
 * Get available user roles
 */
router.get('/roles', async (req: Request, res: Response) => {
  try {
    const permissions = await bulkUserOperationsService.getAvailablePermissions();

    // Mock roles data
    const roles = [
      {
        id: 'role-customer',
        name: 'Customer',
        description: 'Standard platform user',
        permissions: permissions.filter(p => p.category === 'USER_MANAGEMENT' && p.action === 'READ'),
        isSystemRole: true
      },
      {
        id: 'role-driver',
        name: 'Driver',
        description: 'Vehicle driver with booking access',
        permissions: permissions.filter(p => ['USER_MANAGEMENT', 'ANALYTICS'].includes(p.category) && p.action === 'READ'),
        isSystemRole: true
      },
      {
        id: 'role-company-admin',
        name: 'Company Admin',
        description: 'Company administrator with limited platform access',
        permissions: permissions.filter(p => !['SYSTEM'].includes(p.category)),
        isSystemRole: true
      },
      {
        id: 'role-platform-admin',
        name: 'Platform Admin',
        description: 'Full platform administrator',
        permissions: permissions,
        isSystemRole: true
      }
    ];

    res.json({
      success: true,
      data: {
        roles,
        permissions
      }
    });

  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch roles'
    });
  }
});

/**
 * POST /api/platform-admin/users/groups
 * Create user group
 */
router.post('/groups', async (req: Request, res: Response) => {
  try {
    const { name, description, criteria, autoUpdate } = req.body;
    const createdBy = req.user?.userId || 'system';

    // Validate required fields
    if (!name || !description || !criteria) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, description, criteria'
      });
    }

    const group = await bulkUserOperationsService.createUserGroup(
      { name, description, criteria, autoUpdate: autoUpdate || false },
      createdBy
    );

    // Log group creation
    await userActivityMonitoringService.logAdminAction({
      adminId: createdBy,
      adminName: req.user?.email || 'System',
      action: 'USER_GROUP_CREATED',
      category: 'USER_MANAGEMENT',
      targetType: 'SYSTEM',
      targetId: group.id,
      changes: [
        {
          field: 'groupName',
          previousValue: null,
          newValue: name
        }
      ],
      reason: 'User group created',
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: new Date(),
      impact: 'LOW'
    });

    res.status(201).json({
      success: true,
      data: group,
      message: 'User group created successfully'
    });

  } catch (error) {
    console.error('Error creating user group:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user group'
    });
  }
});

/**
 * GET /api/platform-admin/users/groups/:id/members
 * Get users in group
 */
router.get('/groups/:id/members', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const users = await bulkUserOperationsService.getUsersInGroup(id);

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch group members'
    });
  }
});

/**
 * GET /api/platform-admin/audit/user-actions
 * Get admin action audit trail
 */
router.get('/audit/user-actions', async (req: Request, res: Response) => {
  try {
    const {
      adminId,
      category,
      targetType,
      startDate,
      endDate,
      limit = '50',
      offset = '0'
    } = req.query;

    const filters: any = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    if (adminId) filters.adminId = adminId as string;
    if (category) filters.category = category as string;
    if (targetType) filters.targetType = targetType as string;
    
    if (startDate || endDate) {
      filters.dateRange = {
        start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: endDate ? new Date(endDate as string) : new Date()
      };
    }

    const result = await userActivityMonitoringService.getAdminAuditLogs(filters);

    res.json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: result.total > (filters.offset + filters.limit)
      }
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch audit logs'
    });
  }
});

/**
 * POST /api/platform-admin/users/suspicious-activity/:id/resolve
 * Resolve suspicious activity alert
 */
router.post('/suspicious-activity/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolution, notes } = req.body;
    const resolvedBy = req.user?.userId || 'system';

    // Validate required fields
    if (!resolution || !notes) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: resolution, notes'
      });
    }

    // Validate resolution type
    const validResolutions = ['RESOLVED', 'FALSE_POSITIVE'];
    if (!validResolutions.includes(resolution)) {
      return res.status(400).json({
        success: false,
        error: `Invalid resolution. Must be one of: ${validResolutions.join(', ')}`
      });
    }

    await userActivityMonitoringService.resolveSuspiciousActivity(id, resolution, notes, resolvedBy);

    res.json({
      success: true,
      message: 'Suspicious activity alert resolved successfully'
    });

  } catch (error) {
    console.error('Error resolving suspicious activity:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resolve suspicious activity'
    });
  }
});

/**
 * GET /api/platform-admin/users/:id/behavior-analytics
 * Get user behavior analytics
 */
router.get('/:id/behavior-analytics', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { timeframe = 'WEEKLY' } = req.query;

    // Validate timeframe
    const validTimeframes = ['DAILY', 'WEEKLY', 'MONTHLY'];
    if (!validTimeframes.includes(timeframe as string)) {
      return res.status(400).json({
        success: false,
        error: `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`
      });
    }

    const analytics = await userActivityMonitoringService.getUserBehaviorAnalytics(
      id, 
      timeframe as 'DAILY' | 'WEEKLY' | 'MONTHLY'
    );

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error fetching behavior analytics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch behavior analytics'
    });
  }
});

/**
 * GET /api/platform-admin/users/:id/engagement-metrics
 * Get user engagement metrics
 */
router.get('/:id/engagement-metrics', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const metrics = await userActivityMonitoringService.getUserEngagementMetrics(id);

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch engagement metrics'
    });
  }
});

/**
 * POST /api/platform-admin/users/activity-patterns
 * Create activity pattern for detection
 */
router.post('/activity-patterns', async (req: Request, res: Response) => {
  try {
    const { name, description, type, severity, conditions, actions } = req.body;
    const createdBy = req.user?.userId || 'system';

    // Validate required fields
    if (!name || !description || !type || !severity || !conditions || !actions) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, description, type, severity, conditions, actions'
      });
    }

    // Validate type and severity
    const validTypes = ['SUSPICIOUS', 'NORMAL', 'FRAUD_INDICATOR', 'SECURITY_RISK'];
    const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
      });
    }

    const pattern = await userActivityMonitoringService.createActivityPattern(
      { name, description, type, severity, conditions, actions },
      createdBy
    );

    // Log pattern creation
    await userActivityMonitoringService.logAdminAction({
      adminId: createdBy,
      adminName: req.user?.email || 'System',
      action: 'ACTIVITY_PATTERN_CREATED',
      category: 'SECURITY',
      targetType: 'SYSTEM',
      targetId: pattern.id,
      changes: [
        {
          field: 'patternName',
          previousValue: null,
          newValue: name
        },
        {
          field: 'severity',
          previousValue: null,
          newValue: severity
        }
      ],
      reason: 'Activity pattern created for suspicious activity detection',
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: new Date(),
      impact: severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM'
    });

    res.status(201).json({
      success: true,
      data: pattern,
      message: 'Activity pattern created successfully'
    });

  } catch (error) {
    console.error('Error creating activity pattern:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create activity pattern'
    });
  }
});

/**
 * POST /api/platform-admin/users/:userId/reset-password
 * Reset user password (platform admin only)
 */
router.post('/:userId/reset-password', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const adminUserId = req.user?.userId || 'system';

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate new temporary password
    const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Update user with new temporary password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        isTemporaryPassword: true, // Mark as temporary password requiring change
        updatedAt: new Date()
      }
    });

    // Log the password reset action
    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_RESET',
        entityType: 'USER',
        entityId: userId,
        adminUserId,
        changes: {
          targetUser: {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            company: user.company?.name
          },
          resetBy: adminUserId,
          resetAt: new Date().toISOString(),
          newTemporaryPassword: true
        },
        reason: `Password reset by admin for user ${user.firstName} ${user.lastName}`,
        ipAddress: req.ip || 'unknown'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      data: {
        userId: user.id,
        email: user.email,
        tempPassword: tempPassword,
        requiresPasswordChange: true
      }
    });

  } catch (error) {
    console.error('Error resetting user password:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset password'
    });
  }
});

export default router;