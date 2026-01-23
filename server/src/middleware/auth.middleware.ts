import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../config/firebase.js';
import prisma from '../config/database.js';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        companyId: string | null;
        role: string;
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
