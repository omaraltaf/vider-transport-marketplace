/**
 * Socket Authentication Middleware
 * Handles WebSocket authentication using JWT tokens
 */

import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export interface SocketUser {
  id: string;
  email: string;
  role: string;
  companyId?: string;
}

/**
 * Authenticate WebSocket connection using JWT token
 */
export const authenticateSocket = async (socket: any, next: any) => {
  try {
    // Get token from handshake auth or query
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      logger.warn('WebSocket connection attempted without token', { 
        socketId: socket.id,
        ip: socket.handshake.address 
      });
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (!decoded || !decoded.userId) {
      logger.warn('WebSocket connection with invalid token', { 
        socketId: socket.id,
        ip: socket.handshake.address 
      });
      return next(new Error('Invalid authentication token'));
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        emailVerified: true
      }
    });

    if (!user || !user.emailVerified) {
      logger.warn('WebSocket connection for non-existent/unverified user', { 
        socketId: socket.id,
        userId: decoded.userId,
        ip: socket.handshake.address 
      });
      return next(new Error('User not found or not verified'));
    }

    // Attach user data to socket
    socket.data.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId
    };

    logger.info('WebSocket authenticated successfully', { 
      socketId: socket.id,
      userId: user.id,
      role: user.role,
      ip: socket.handshake.address 
    });

    next();
  } catch (error) {
    logger.error('WebSocket authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new Error('Invalid authentication token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      return next(new Error('Authentication token expired'));
    } else {
      return next(new Error('Authentication failed'));
    }
  }
};