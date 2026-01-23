import { apiClient } from './api';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

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
  accessToken: string; // Firebase ID Token
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

class AuthService {
  async register(data: RegisterData): Promise<RegisterResponse> {
    // Backend handles both Firebase user creation and DB sync
    return await apiClient.post<RegisterResponse>('/auth/register', data);
  }

  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const idToken = await userCredential.user.getIdToken();

      // Fetch user profile from our backend to get role and companyId
      const profile = await apiClient.get<any>('/user/profile', idToken);

      return {
        accessToken: idToken,
        refreshToken: userCredential.user.refreshToken,
        user: {
          id: userCredential.user.uid,
          email: userCredential.user.email || '',
          role: profile.role,
          companyId: profile.companyId,
        }
      };
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  }

  async logout(): Promise<void> {
    await signOut(auth);
    return await apiClient.post<void>('/auth/logout', {});
  }
}

export const authService = new AuthService();
