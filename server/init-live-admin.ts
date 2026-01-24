import { adminAuth } from './src/config/firebase.ts';
import prisma from './src/config/database.ts';
import { Role } from '@prisma/client';

async function initPlatformAdmin() {
    const email = 'admin@vider.no';
    try {
        console.log(`Starting initialization for ${email}...`);

        // 1. Get Firebase User
        const firebaseUser = await adminAuth.getUserByEmail(email);
        const uid = firebaseUser.uid;
        console.log(`Found Firebase UID: ${uid}`);

        // 2. Create HQ Company
        const company = await prisma.company.upsert({
            where: { organizationNumber: '000000000' },
            update: {},
            create: {
                name: 'Vider Platform HQ',
                organizationNumber: '000000000',
                businessAddress: 'Sørkedalsveien 10',
                city: 'Oslo',
                postalCode: '0369',
                fylke: 'Oslo',
                kommune: 'Oslo',
                status: 'ACTIVE',
                verified: true
            }
        });
        console.log('HQ Company created/verified.');

        // 3. Create/Update User in DB
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                role: Role.PLATFORM_ADMIN,
                status: 'ACTIVE',
                emailVerified: true,
                companyId: company.id
            },
            create: {
                id: uid,
                email,
                firstName: 'Platform',
                lastName: 'Administrator',
                role: Role.PLATFORM_ADMIN,
                status: 'ACTIVE',
                emailVerified: true,
                companyId: company.id
            }
        });
        console.log('User created/updated in database.');

        // 4. Set Firebase Custom Claims
        await adminAuth.setCustomUserClaims(uid, {
            role: 'PLATFORM_ADMIN',
            admin: true
        });
        console.log('Firebase custom claims updated.');

        console.log('\n✅ Platform Admin successfully restored on live platform.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during initialization:', error);
        process.exit(1);
    }
}

initPlatformAdmin();
