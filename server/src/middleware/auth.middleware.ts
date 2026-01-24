import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../config/firebase.js';
import prisma from '../config/database.js';
import { Role } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        companyId: string | null;
        role: Role;
    };
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        const user = await prisma.user.findUnique({
            where: { id: decodedToken.uid },
            select: { id: true, email: true, companyId: true, role: true },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found in database' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

export const requireRole = (role: Role) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (req.user.role !== role) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        next();
    };
};

export const requirePlatformAdmin = requireRole(Role.PLATFORM_ADMIN);
