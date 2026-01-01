import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { getDatabaseClient } from '../config/database';

type Company = {
  id: string;
  name: string;
  organizationNumber: string;
  businessAddress: string;
  city: string;
  postalCode: string;
  fylke: string;
  kommune: string;
  vatRegistered: boolean;
  description: string | null;
  verified: boolean;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  aggregatedRating: number | null;
  totalRatings: number;
  createdAt: Date;
  updatedAt: Date;
};

const prisma = getDatabaseClient();

export interface CompanyProfileUpdateData {
  name?: string;
  businessAddress?: string;
  city?: string;
  postalCode?: string;
  fylke?: string;
  kommune?: string;
  vatRegistered?: boolean;
  description?: string;
}

export interface CompanyPublicProfile {
  id: string;
  name: string;
  businessAddress: string;
  city: string;
  postalCode: string;
  fylke: string;
  kommune: string;
  vatRegistered: boolean;
  description: string | null;
  verified: boolean;
  verifiedAt: Date | null;
  aggregatedRating: number | null;
  totalRatings: number;
  createdAt: Date;
  updatedAt: Date;
}

export class CompanyService {
  /**
   * Update company profile
   * Only allows updating specific fields, not sensitive data like organizationNumber
   */
  async updateProfile(companyId: string, data: CompanyProfileUpdateData): Promise<Company> {
    // Validate that at least one field is being updated
    if (Object.keys(data).length === 0) {
      throw new Error('NO_FIELDS_TO_UPDATE');
    }

    // Validate required fields if they are being updated
    if (data.name !== undefined && data.name.trim() === '') {
      throw new Error('COMPANY_NAME_REQUIRED');
    }

    if (data.businessAddress !== undefined && data.businessAddress.trim() === '') {
      throw new Error('BUSINESS_ADDRESS_REQUIRED');
    }

    if (data.city !== undefined && data.city.trim() === '') {
      throw new Error('CITY_REQUIRED');
    }

    if (data.postalCode !== undefined && data.postalCode.trim() === '') {
      throw new Error('POSTAL_CODE_REQUIRED');
    }

    if (data.fylke !== undefined && data.fylke.trim() === '') {
      throw new Error('FYLKE_REQUIRED');
    }

    if (data.kommune !== undefined && data.kommune.trim() === '') {
      throw new Error('KOMMUNE_REQUIRED');
    }

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!existingCompany) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    // Update company profile
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data,
    });

    logger.info('Company profile updated', { companyId, updatedFields: Object.keys(data) });

    return updatedCompany;
  }

  /**
   * Get company public profile
   */
  async getPublicProfile(companyId: string): Promise<CompanyPublicProfile> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    return {
      id: company.id,
      name: company.name,
      businessAddress: company.businessAddress,
      city: company.city,
      postalCode: company.postalCode,
      fylke: company.fylke,
      kommune: company.kommune,
      vatRegistered: company.vatRegistered,
      description: company.description,
      verified: company.verified,
      verifiedAt: company.verifiedAt,
      aggregatedRating: company.aggregatedRating,
      totalRatings: company.totalRatings,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }

  /**
   * Verify company (admin only)
   * Sets verified flag and records who verified and when
   */
  async verifyCompany(companyId: string, adminUserId: string): Promise<Company> {
    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    if (company.verified) {
      throw new Error('COMPANY_ALREADY_VERIFIED');
    }

    // Update company verification status
    const verifiedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: adminUserId,
      },
    });

    logger.info('Company verified', { companyId, adminUserId });

    return verifiedCompany;
  }

  /**
   * Remove company verification (admin only)
   */
  async unverifyCompany(companyId: string, adminUserId: string): Promise<Company> {
    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    if (!company.verified) {
      throw new Error('COMPANY_NOT_VERIFIED');
    }

    // Remove company verification
    const unverifiedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        verified: false,
        verifiedAt: null,
        verifiedBy: null,
      },
    });

    logger.info('Company verification removed', { companyId, adminUserId });

    return unverifiedCompany;
  }

  /**
   * Get company by ID (internal use)
   */
  async getCompanyById(companyId: string): Promise<Company | null> {
    return prisma.company.findUnique({
      where: { id: companyId },
    });
  }

  /**
   * Get company by organization number
   */
  async getCompanyByOrgNumber(organizationNumber: string): Promise<Company | null> {
    return prisma.company.findUnique({
      where: { organizationNumber },
    });
  }

  /**
   * Get platform statistics for landing page
   */
  async getPlatformStats(): Promise<{
    verifiedCompanies: number;
    averageRating: string;
    activeListings: number;
    completedBookings: number;
  }> {
    // Count verified companies
    const verifiedCompanies = await prisma.company.count({
      where: { verified: true },
    });

    // Calculate average rating across all companies
    const companies = await prisma.company.findMany({
      where: {
        aggregatedRating: { not: null },
      },
      select: {
        aggregatedRating: true,
      },
    });

    const averageRating = companies.length > 0
      ? (companies.reduce((sum: number, c: { aggregatedRating: number | null }) => sum + (c.aggregatedRating || 0), 0) / companies.length).toFixed(1)
      : '0.0';

    // Count active listings (vehicles + drivers)
    const activeVehicles = await prisma.vehicleListing.count({
      where: { status: 'ACTIVE' },
    });

    const activeDrivers = await prisma.driverListing.count({
      where: { status: 'ACTIVE' },
    });

    const activeListings = activeVehicles + activeDrivers;

    // Count completed bookings
    const completedBookings = await prisma.booking.count({
      where: { status: 'COMPLETED' },
    });

    return {
      verifiedCompanies,
      averageRating,
      activeListings,
      completedBookings,
    };
  }
}

export const companyService = new CompanyService();
