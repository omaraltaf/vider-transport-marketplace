import { PrismaClient, Role } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export class AuthorizationService {
  /**
   * Check if user has the required role
   */
  async checkRole(userId: string, requiredRole: Role): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return false;
    }

    // Role hierarchy: PLATFORM_ADMIN > COMPANY_ADMIN > COMPANY_USER
    const roleHierarchy: Record<Role, number> = {
      [Role.PLATFORM_ADMIN]: 3,
      [Role.COMPANY_ADMIN]: 2,
      [Role.COMPANY_USER]: 1,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }

  /**
   * Check if user has access to a specific company
   */
  async checkCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return false;
    }

    // Platform admins have access to all companies
    if (user.role === Role.PLATFORM_ADMIN) {
      return true;
    }

    // Other users can only access their own company
    return user.companyId === companyId;
  }

  /**
   * Check if user owns a specific resource
   */
  async checkResourceOwnership(
    userId: string,
    resourceId: string,
    resourceType: 'listing' | 'booking' | 'company'
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return false;
    }

    // Platform admins have access to all resources
    if (user.role === Role.PLATFORM_ADMIN) {
      return true;
    }

    switch (resourceType) {
      case 'listing': {
        const listing = await prisma.vehicleListing.findUnique({
          where: { id: resourceId },
          select: { companyId: true },
        });
        return listing?.companyId === user.companyId;
      }

      case 'booking': {
        const booking = await prisma.booking.findUnique({
          where: { id: resourceId },
          select: { renterCompanyId: true, providerCompanyId: true },
        });
        return (
          booking?.renterCompanyId === user.companyId ||
          booking?.providerCompanyId === user.companyId
        );
      }

      case 'company': {
        return resourceId === user.companyId;
      }

      default:
        return false;
    }
  }

  /**
   * Check if user can perform an action on a resource
   */
  async canPerformAction(
    userId: string,
    action: 'create' | 'read' | 'update' | 'delete',
    resourceType: string,
    resourceId?: string
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, companyId: true },
    });

    if (!user) {
      return false;
    }

    // Platform admins can do anything
    if (user.role === Role.PLATFORM_ADMIN) {
      return true;
    }

    // Define permissions by role and resource type
    const permissions: Record<Role, Record<string, string[]>> = {
      [Role.PLATFORM_ADMIN]: {
        '*': ['create', 'read', 'update', 'delete'],
      },
      [Role.COMPANY_ADMIN]: {
        listing: ['create', 'read', 'update', 'delete'],
        driver: ['create', 'read', 'update', 'delete'],
        booking: ['create', 'read', 'update'],
        company: ['read', 'update'],
        user: ['create', 'read', 'update', 'delete'],
      },
      [Role.COMPANY_USER]: {
        listing: ['read'],
        driver: ['read'],
        booking: ['create', 'read'],
        company: ['read'],
      },
    };

    const rolePermissions = permissions[user.role];
    const resourcePermissions = rolePermissions?.[resourceType] || [];

    // Check if action is allowed for this role and resource type
    if (!resourcePermissions.includes(action)) {
      return false;
    }

    // If resourceId is provided, check ownership
    if (resourceId && action !== 'create') {
      return this.checkResourceOwnership(userId, resourceId, resourceType as any);
    }

    return true;
  }

  /**
   * Get user's effective permissions
   */
  async getUserPermissions(userId: string): Promise<{
    role: Role;
    companyId: string;
    canAccessAllCompanies: boolean;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, companyId: true },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return {
      role: user.role,
      companyId: user.companyId,
      canAccessAllCompanies: user.role === Role.PLATFORM_ADMIN,
    };
  }
}

export const authorizationService = new AuthorizationService();
