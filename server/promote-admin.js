import { adminAuth } from './src/config/firebase.ts';
import prisma from './src/config/database.ts';
import { Role } from '@prisma/client';

async function promoteToAdmin(email) {
    try {
        console.log(`Searching for user with email: ${email}...`);

        // 1. Get user from Firebase
        const firebaseUser = await adminAuth.getUserByEmail(email);
        const uid = firebaseUser.uid;

        console.log(`Found Firebase user with UID: ${uid}`);

        // 2. Set Firebase Custom Claims
        await adminAuth.setCustomUserClaims(uid, {
            role: 'PLATFORM_ADMIN',
            admin: true
        });
        console.log('Successfully set Firebase custom claims.');

        // 3. Update Database Role
        await prisma.user.update({
            where: { email },
            data: {
                role: Role.PLATFORM_ADMIN,
                status: 'ACTIVE',
                emailVerified: true
            }
        });
        console.log('Successfully updated user role in database.');

        console.log(`\nSuccess! ${email} is now a Platform Admin.`);
        process.exit(0);
    } catch (error) {
        console.error('Error promoting user:', error);
        process.exit(1);
    }
}

const email = process.argv[2];
if (!email) {
    console.error('Please provide an email address: node promote-admin.js <email>');
    process.exit(1);
}

promoteToAdmin(email);
