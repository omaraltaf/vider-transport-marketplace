import { PrismaClient, Role } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function verifyUser(email: string) {
    try {
        console.log(`🔍 Searching for user with email: ${email}...`);

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.error('❌ User not found in database.');
            process.exit(1);
        }

        console.log(`✅ Found user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                role: Role.PLATFORM_ADMIN, // Promoting to Platform Admin as requested
            },
        });

        console.log('🚀 Success! User has been verified and promoted to PLATFORM_ADMIN.');
        console.log('You should now be able to log in and access all administrative features.');

    } catch (error) {
        console.error('❌ Error updating user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

const email = process.argv[2];
if (!email) {
    console.error('Usage: npx tsx scripts/verify-user.ts <email>');
    process.exit(1);
}

verifyUser(email);
