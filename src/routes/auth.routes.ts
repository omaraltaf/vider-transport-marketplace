import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { logError } from '../utils/logging.utils';
import { z } from 'zod';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  companyName: z.string().min(1),
  organizationNumber: z.string().regex(/^\d{9}$/),
  businessAddress: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  fylke: z.string().min(1),
  kommune: z.string().min(1),
  vatRegistered: z.boolean(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

/**
 * Register a new company and user
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    
    const result = await authService.register(data as any);
    
    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      userId: result.userId,
      // In production, don't send the token in response - send via email
      verificationToken: result.verificationToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
        },
      });
    }

    if (error instanceof Error) {
      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        return res.status(409).json({
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'An account with this email already exists',
          },
        });
      }

      if (error.message === 'ORGANIZATION_NUMBER_EXISTS') {
        return res.status(409).json({
          error: {
            code: 'ORGANIZATION_NUMBER_EXISTS',
            message: 'An account with this organization number already exists',
          },
        });
      }

      if (error.message === 'INVALID_ORGANIZATION_NUMBER') {
        return res.status(400).json({
          error: {
            code: 'INVALID_ORGANIZATION_NUMBER',
            message: 'Organization number must be 9 digits',
          },
        });
      }
    }

    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Registration failed',
      },
    });
  }
});

/**
 * Verify email with token
 * POST /api/auth/verify-email
 */
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = verifyEmailSchema.parse(req.body);
    
    await authService.verifyEmail(token);
    
    res.status(200).json({
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
        },
      });
    }

    if (error instanceof Error) {
      if (error.message === 'INVALID_VERIFICATION_TOKEN') {
        return res.status(400).json({
          error: {
            code: 'INVALID_VERIFICATION_TOKEN',
            message: 'Invalid or expired verification token',
          },
        });
      }

      if (error.message === 'EMAIL_ALREADY_VERIFIED') {
        return res.status(400).json({
          error: {
            code: 'EMAIL_ALREADY_VERIFIED',
            message: 'Email is already verified',
          },
        });
      }
    }

    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Email verification failed',
      },
    });
  }
});

/**
 * Login with email and password
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const tokens = await authService.login(email, password);
    
    // Get user data to return with tokens
    const payload = authService.verifyToken(tokens.accessToken);
    
    res.status(200).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        companyId: payload.companyId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
        },
      });
    }

    if (error instanceof Error) {
      if (error.message === 'INVALID_CREDENTIALS') {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        });
      }

      if (error.message === 'EMAIL_NOT_VERIFIED') {
        return res.status(403).json({
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Please verify your email before logging in',
          },
        });
      }
    }

    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Login failed',
      },
    });
  }
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    
    const result = await authService.refreshAccessToken(refreshToken);
    
    res.status(200).json({
      accessToken: result.accessToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
        },
      });
    }

    if (error instanceof Error && error.message === 'INVALID_REFRESH_TOKEN') {
      return res.status(401).json({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
        },
      });
    }

    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Token refresh failed',
      },
    });
  }
});

/**
 * Logout
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // In a production system, you might want to blacklist the token
    // For now, just return success (client will remove tokens)
    res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Logout failed',
      },
    });
  }
});

export default router;
