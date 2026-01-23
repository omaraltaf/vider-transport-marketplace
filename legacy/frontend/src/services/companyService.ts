/**
 * Company Service
 * API calls for company profile management
 */

import { apiClient } from './api';
import type { Company } from '../types';

export interface UpdateCompanyProfileData {
  description?: string;
  businessAddress?: string;
  city?: string;
  postalCode?: string;
  fylke?: string;
  kommune?: string;
}

export const companyService = {
  /**
   * Get company public profile
   */
  async getProfile(companyId: string): Promise<Company> {
    return apiClient.get<Company>(`/companies/${companyId}`);
  },

  /**
   * Update company profile (requires authentication and company admin role)
   */
  async updateProfile(
    companyId: string,
    data: UpdateCompanyProfileData,
    token: string
  ): Promise<Company> {
    return apiClient.put<Company>(`/companies/${companyId}`, data, token);
  },
};
