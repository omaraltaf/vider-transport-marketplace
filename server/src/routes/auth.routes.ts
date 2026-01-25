import { Router, Request, Response } from 'express';
import { adminAuth } from '../config/firebase.js';
import { Role } from '@prisma/client';
import prisma from '../config/database.js';

import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
    res.json(req.user);
});

router.post('/register', async (req: Request, res: Response) => {
    const {
        email,
        password,
        firstName,
        lastName,
        phone,
        companyName,
        organizationNumber,
        businessAddress,
        city,
        postalCode,
        fylke,
        kommune,
        vatRegistered,
    } = req.body;

    try {
        // 1. Transactional DB creation
        const result = await prisma.$transaction(async (tx) => {
            // Create Company
            const company = await tx.company.create({
                data: {
                    name: companyName,
                    organizationNumber,
                    businessAddress,
                    city,
                    postalCode,
                    fylke,
                    kommune,
                    vatRegistered: !!vatRegistered,
                },
            });

            // Create User in Firebase (Admin SDK)
            const firebaseUser = await adminAuth.createUser({
                email,
                password,
                displayName: `${firstName} ${lastName}`,
                phoneNumber: phone || undefined,
            });

            // Create User in DB
            const user = await tx.user.create({
                data: {
                    id: firebaseUser.uid,
                    email,
                    firstName,
                    lastName,
                    phone,
                    role: Role.COMPANY_ADMIN,
                    companyId: company.id,
                },
            });

            return { user, company };
        });

        res.status(201).json({
            message: 'Registration successful',
            data: result,
        });
    } catch (error: any) {
        console.error('Registration error:', error);
        res.status(400).json({
            message: error.message || 'Registration failed',
        });
    }
});

export default router;
