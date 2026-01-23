import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { getDatabaseClient } from '../config/database';
import { firebaseAuth } from '../config/firebase';
import crypto from 'crypto';

const prisma = getDatabaseClient();

export interface CompanyRegistrationData {
  // User data
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;

  // Company data
  companyName: string;
  organizationNumber: string;
  businessAddress: string;
  city: string;
  postalCode: string;
  fylke: string;
  kommune: string;
  vatRegistered: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  companyId: string;
}

export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly JWT_SECRET = config.JWT_SECRET;
  private readonly ACCESS_TOKEN_EXPIRATION = config.JWT_ACCESS_EXPIRATION;
  private readonly REFRESH_TOKEN_EXPIRATION = config.JWT_REFRESH_EXPIRATION;

  /**
   * Register a new company and create the first admin user
   */
  async register(data: CompanyRegistrationData): Promise<{ userId: string; verificationToken: string }> {
    // Check if email already exists in local DB
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    // Check if organization number already exists
    const existingCompany = await prisma.company.findUnique({
      where: { organizationNumber: data.organizationNumber },
    });

    if (existingCompany) {
      throw new Error('ORGANIZATION_NUMBER_EXISTS');
    }

    // Validate organization number format
    if (!/^\d{9}$/.test(data.organizationNumber)) {
      throw new Error('INVALID_ORGANIZATION_NUMBER');
    }

    // Hash password for local legacy support (optional, but keep for now)
    const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);

    // Create user in Firebase
    let firebaseUser;
    try {
      firebaseUser = await firebaseAuth.createUser({
        email: data.email,
        password: data.password,
        displayName: `${data.firstName} ${data.lastName}`,
        phoneNumber: data.phone.startsWith('+') ? data.phone : undefined, // Firebase requires E.164
      });
    } catch (error) {
      logger.error('Firebase user creation failed', { error: error.message, email: data.email });
      if (error.code === 'auth/email-already-exists') {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
      throw new Error('AUTH_PROVIDER_ERROR');
    }

    // Generate email verification token (Firebase handles this better on frontend, but keeping for compatibility)
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create company and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create company
      const company = await tx.company.create({
        data: {
          name: data.companyName,
          organizationNumber: data.organizationNumber,
          businessAddress: data.businessAddress,
          city: data.city,
          postalCode: data.postalCode,
          fylke: data.fylke,
          kommune: data.kommune,
          vatRegistered: data.vatRegistered,
        },
      });

      // Create user as company admin
      const user = await tx.user.create({
        data: {
          id: firebaseUser.uid, // Use Firebase UID as the primary key
          email: data.email,
          passwordHash, // Keep for legacy if needed
          role: Role.COMPANY_ADMIN,
          companyId: company.id,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          emailVerified: false,
          verificationToken,
        },
      });

      return { userId: user.id, verificationToken };
    });

    logger.info('User registered with Firebase', { userId: result.userId, email: data.email });

    return result;
  }

  /**
   * Verify email with verification token
   */
  async verifyEmail(token: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new Error('INVALID_VERIFICATION_TOKEN');
    }

    if (user.emailVerified) {
      throw new Error('EMAIL_ALREADY_VERIFIED');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });

    logger.info('Email verified', { userId: user.id, email: user.email });
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthTokens & { requiresPasswordChange?: boolean }> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    if (!user.emailVerified) {
      throw new Error('EMAIL_NOT_VERIFIED');
    }

    // Check if password change is required
    const requiresPasswordChange = user.isTemporaryPassword || false;

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    logger.info('User logged in', { userId: user.id, email: user.email, requiresPasswordChange });

    return { ...tokens, requiresPasswordChange };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = jwt.verify(refreshToken, this.JWT_SECRET) as TokenPayload;

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user || !user.emailVerified) {
        throw new Error('INVALID_REFRESH_TOKEN');
      }

      // Generate new access token
      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
        },
        this.JWT_SECRET,
        { expiresIn: this.ACCESS_TOKEN_EXPIRATION } as jwt.SignOptions
      );

      return { accessToken };
    } catch (error) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }
  }

  /**
   * Logout (client-side token removal, server-side can implement token blacklist)
   */
  async logout(userId: string): Promise<void> {
    // In a production system, you might want to:
    // 1. Add refresh token to a blacklist
    // 2. Clear any session data
    // 3. Log the logout event

    logger.info('User logged out', { userId });
  }

  /**
   * Request password reset
   */
  async resetPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      logger.warn('Password reset requested for non-existent email', { email });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    logger.info('Password reset requested', { userId: user.id, email });

    // In production, send email with reset link
    // await emailService.sendPasswordResetEmail(email, resetToken);
  }

  /**
   * Confirm password reset with token
   */
  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new Error('INVALID_OR_EXPIRED_RESET_TOKEN');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    logger.info('Password reset completed', { userId: user.id });
  }

  /**
   * Force password change for users with temporary passwords
   */
  async forceChangePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        isTemporaryPassword: false, // Mark password as no longer temporary
      },
    });

    logger.info('User forced password change completed', { userId });
  }

  /**
   * Verify Firebase ID Token
   */
  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const decodedToken = await firebaseAuth.verifyIdToken(token);

      // Fetch user from DB to get role and companyId
      const user = await prisma.user.findUnique({
        where: { id: decodedToken.uid },
      });

      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      return {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId || '',
      };
    } catch (error) {
      logger.error('Token verification failed', { error: error.message });
      throw new Error('INVALID_TOKEN');
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRATION,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRATION,
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }

  /**
   * Hash password (exposed for testing)
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify password against hash (exposed for testing)
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

export const authService = new AuthService();
