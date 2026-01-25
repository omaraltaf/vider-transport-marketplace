import { adminAuth } from './src/config/firebase.ts';
import prisma from './src/config/database.ts';
import { Role } from '@prisma/client';

async function repairUser(email) {
    try {
        console.log(`Searching for ${email} in Firebase...`);
        const firebaseUser = await adminAuth.getUserByEmail(email);
        const uid = firebaseUser.uid;
        console.log(`Found Firebase UID: ${uid}`);

        // Get or Create a default company for individual users if needed, 
        // or just link to HQ for now since they are likely transporters or similar.
        // For this specific repair, we'll try to find an existing company or use HQ.
        const company = await prisma.company.findFirst({
            where: { organizationNumber: '000000000' }
        });

        const user = await prisma.user.upsert({
            where: { email },
            update: {
                id: uid, // Ensure UID matches
                status: 'ACTIVE',
                emailVerified: true,
            },
            create: {
                id: uid,
                email,
                firstName: firebaseUser.displayName?.split(' ')[0] || 'User',
                lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || 'Name',
                role: Role.TRANSPORTER, // Default to transporter or whatever is appropriate
                status: 'ACTIVE',
                emailVerified: true,
                phone: firebaseUser.phoneNumber || null,
                companyId: company?.id
            }
        });

        console.log(`✅ User ${email} synced to database successfully.`);
        console.log(JSON.stringify(user, null, 2));
    } catch (error) {
        console.error('❌ Error repairing user:', error);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

const email = process.argv[2];
if (!email) {
    console.error('Usage: npx tsx repair-user.ts <email>');
    process.exit(1);
}

repairUser(email);
