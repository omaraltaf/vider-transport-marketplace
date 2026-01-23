import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { env } from './env.js';

if (!getApps().length) {
    try {
        if (env.NODE_ENV === 'development' && !env.FIREBASE_PROJECT_ID) {
            console.warn('⚠️ Firebase Admin not initialized: Missing environment variables.');
        } else {
            const serviceAccount: ServiceAccount = {
                projectId: env.FIREBASE_PROJECT_ID,
                clientEmail: env.FIREBASE_CLIENT_EMAIL,
                privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            };

            initializeApp({
                credential: cert(serviceAccount),
            });
            console.log('🔥 Firebase Admin initialized successfully.');
        }
    } catch (error) {
        console.error('❌ Firebase Admin initialization error:', error);
    }
}

// Helper to safely proxy Firebase services
const createSafeProxy = <T extends object>(getter: () => T, name: string): T => {
    return new Proxy({} as T, {
        get(_, prop) {
            if (!getApps().length) {
                throw new Error(`❌ Firebase ${name} accessed before initialization. Check your environment variables.`);
            }
            const service = getter();
            const value = (service as any)[prop];
            return typeof value === 'function' ? value.bind(service) : value;
        }
    });
};

export const adminAuth: any = createSafeProxy(getAuth, 'Auth');
export const db: any = createSafeProxy(getFirestore, 'Firestore');
export const storage: any = createSafeProxy(getStorage, 'Storage');
