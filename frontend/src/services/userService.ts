/**
 * User Service
 * API client for user profile operations
 */

import { apiClient } from '../services/api';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'PLATFORM_ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_USER';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    name: string;
    organizationNumber: string;
    verified: boolean;
  };
}

export interface UpdateUserProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface UserStatistics {
  totalBookings: number;
  totalListings: number;
  memberSince: string;
  lastLogin: string | null;
}

class UserService {
  /**
   * Get current user profile
   */
  async getUserProfile(token: string): Promise<UserProfile> {
    return await apiClient.get<UserProfile>('/user/profile', token);
  }

  /**
   * Update user profile
   */
  async updateUserProfile(data: UpdateUserProfileData, token: string): Promise<UserProfile> {
    const response = await apiClient.put<{ message: string; profile: UserProfile }>('/user/profile', data, token);
    return response.profile;
  }

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordData, token: string): Promise<void> {
    await apiClient.post<{ message: string }>('/user/change-password', data, token);
  }

  /**
   * Delete user account
   */
  async deleteAccount(token: string): Promise<void> {
    await apiClient.delete<{ message: string }>('/user/account', token);
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(token: string): Promise<UserStatistics> {
    return await apiClient.get<UserStatistics>('/user/statistics', token);
  }
}

export const userService = new UserService();