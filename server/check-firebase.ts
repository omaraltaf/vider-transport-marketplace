import { adminAuth } from './src/config/firebase.ts';

async function checkFirebase(email) {
    try {
        const user = await adminAuth.getUserByEmail(email);
        console.log(JSON.stringify(user, null, 2));
    } catch (error) {
        console.log('Firebase user not found');
    } finally {
        process.exit(0);
    }
}

const email = process.argv[2];
if (!email) {
    console.error('Usage: npx tsx check-firebase.ts <email>');
    process.exit(1);
}

checkFirebase(email);
