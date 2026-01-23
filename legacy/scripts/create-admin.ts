import { PrismaClient, Role } from '@prisma/client';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize Firebase Admin (mimicking src/config/firebase.ts)
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

const firebaseAuth = admin.auth();
const prisma = new PrismaClient();

async function createAdmin(email: string, password: string) {
    try {
        console.log(`🚀 Creating Platform Admin: ${email}...`);

        // 1. Create or get user in Firebase
        let firebaseUser;
        try {
            firebaseUser = await firebaseAuth.getUserByEmail(email);
            console.log('ℹ️ User already exists in Firebase.');

            // Update password if it already exists to match request
            await firebaseAuth.updateUser(firebaseUser.uid, { password });
            console.log('✅ Password updated in Firebase.');
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                firebaseUser = await firebaseAuth.createUser({
                    email,
                    password,
                    displayName: 'Platform Administrator',
                    emailVerified: true,
                });
                console.log('✅ Created user in Firebase.');
            } else {
                throw error;
            }
        }

        // 2. Ensure a Platform Admin company exists
        let company = await prisma.company.findFirst({
            where: { organizationNumber: '999888777' }
        });

        if (!company) {
            company = await prisma.company.create({
                data: {
                    name: 'Vider Platform Administration',
                    organizationNumber: '999888777',
                    businessAddress: 'Platform HQ',
                    city: 'Oslo',
                    postalCode: '0001',
                    fylke: 'Oslo',
                    kommune: 'Oslo',
                    vatRegistered: true,
                    verified: true,
                }
            });
            console.log('✅ Created Platform Admin company.');
        }

        // 3. Create or update user in local DB
        const userData = {
            id: firebaseUser.uid,
            email,
            passwordHash: 'FIREBASE_MANAGED', // Password is in Firebase
            role: Role.PLATFORM_ADMIN,
            companyId: company.id,
            firstName: 'Platform',
            lastName: 'Administrator',
            phone: '+4700000000',
            emailVerified: true,
        };

        await prisma.user.upsert({
            where: { id: firebaseUser.uid },
            update: {
                role: Role.PLATFORM_ADMIN,
                emailVerified: true,
            },
            create: userData,
        });

        console.log('✅ Synchronized user with local database.');
        console.log('\n--- SUCCESS ---');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log('Role: PLATFORM_ADMIN');
        console.log('----------------');

    } catch (error) {
        console.error('❌ Error creating admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

const email = 'admin@vider.no';
const password = 'password123';

createAdmin(email, password);
