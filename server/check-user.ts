import prisma from './src/config/database.ts';

async function checkUser(email) {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, role: true, status: true }
        });
        console.log(JSON.stringify(user, null, 2));
    } catch (error) {
        console.error('Error checking user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

const email = process.argv[2];
if (!email) {
    console.error('Usage: npx tsx check-user.ts <email>');
    process.exit(1);
}

checkUser(email);
