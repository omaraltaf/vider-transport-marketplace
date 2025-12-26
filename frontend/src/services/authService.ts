/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import { apiClient } from './api';

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string;
  organizationNumber: string;
  businessAddress: string;
  city: string;
  postalCode: string;
  fylke: string;
  kommune: string;
  vatRegistered: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  requiresPasswordChange?: boolean;
  user: {
    id: string;
    email: string;
    role: string;
    companyId: string;
  };
}

export interface RegisterResponse {
  message: string;
  userId: string;
  verificationToken: string;
}

export interface VerifyEmailResponse {
  message: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

class AuthService {
  async register(data: RegisterData): Promise<RegisterResponse> {
    return await apiClient.post<RegisterResponse>('/auth/register', data);
  }

  async login(data: LoginData): Promise<AuthResponse> {
    return await apiClient.post<AuthResponse>('/auth/login', data);
  }

  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    return await apiClient.post<VerifyEmailResponse>('/auth/verify-email', { token });
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    return await apiClient.post<RefreshTokenResponse>('/auth/refresh', { refreshToken });
  }

  async logout(token?: string): Promise<void> {
    return await apiClient.post<void>('/auth/logout', {}, token);
  }
}

export const authService = new AuthService();
