import * as admin from 'firebase-admin';
import { config } from './env';

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFirebase() {
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: config.FIREBASE_PROJECT_ID,
                clientEmail: config.FIREBASE_CLIENT_EMAIL,
                privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
    }
    return admin;
}

export const firebaseAdmin = initializeFirebase();
export const firebaseAuth = firebaseAdmin.auth();
