/**
 * Platform Admin Socket Middleware
 * Ensures only platform administrators can access analytics WebSocket
 */

import { logger } from '../config/logger';

/**
 * Require platform admin role for WebSocket connection
 */
export const requirePlatformAdminSocket = async (socket: any, next: any) => {
  try {
    const user = socket.data.user;

    if (!user) {
      logger.warn('WebSocket authorization attempted without authenticated user', { 
        socketId: socket.id 
      });
      return next(new Error('Authentication required'));
    }

    // Check if user has platform admin role
    if (user.role !== 'PLATFORM_ADMIN') {
      logger.warn('WebSocket access denied for non-platform admin', { 
        socketId: socket.id,
        userId: user.id,
        role: user.role,
        ip: socket.handshake.address 
      });
      return next(new Error('Platform administrator access required'));
    }

    logger.info('WebSocket platform admin authorization successful', { 
      socketId: socket.id,
      userId: user.id,
      ip: socket.handshake.address 
    });

    next();
  } catch (error) {
    logger.error('WebSocket platform admin authorization error:', error);
    return next(new Error('Authorization failed'));
  }
};