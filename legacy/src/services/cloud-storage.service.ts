import { Storage } from '@google-cloud/storage';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { randomUUID } from 'crypto';
import path from 'path';

export class CloudStorageService {
    private readonly storage: Storage;
    private readonly bucketName: string;

    constructor() {
        this.storage = new Storage({
            projectId: config.FIREBASE_PROJECT_ID,
            credentials: {
                client_email: config.FIREBASE_CLIENT_EMAIL,
                private_key: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
        });
        this.bucketName = config.GCS_BUCKET_NAME;
    }

    /**
     * Upload a file to Google Cloud Storage
     * @param file The file to upload (Multer file)
     * @param destination The directory in the bucket
     * @returns The public URL of the uploaded file
     */
    async uploadFile(file: Express.Multer.File, destination: string): Promise<string> {
        try {
            const bucket = this.storage.bucket(this.bucketName);
            const uniqueName = `${randomUUID()}${path.extname(file.originalname)}`;
            const blob = bucket.file(`${destination}/${uniqueName}`);

            const blobStream = blob.createWriteStream({
                resumable: false,
                metadata: {
                    contentType: file.mimetype,
                },
            });

            return new Promise((resolve, reject) => {
                blobStream.on('error', (err) => {
                    logger.error('GCS Upload Error', { error: err.message });
                    reject(new Error('UPLOAD_FAILED'));
                });

                blobStream.on('finish', async () => {
                    // In production, you might want to make the file public or use signed URLs
                    // For now, we assume the bucket is configured for public read or we return a standard path
                    const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${destination}/${uniqueName}`;
                    logger.info('File uploaded to GCS', { url: publicUrl });
                    resolve(publicUrl);
                });

                blobStream.end(file.buffer);
            });
        } catch (error) {
            logger.error('Cloud Storage error', { error: error.message });
            throw new Error('CLOUD_STORAGE_ERROR');
        }
    }

    /**
     * Delete a file from Google Cloud Storage
     * @param fileUrl The URL of the file to delete
     */
    async deleteFile(fileUrl: string): Promise<void> {
        try {
            const urlParts = fileUrl.split(`${this.bucketName}/`);
            if (urlParts.length < 2) return;

            const fileName = urlParts[1];
            const bucket = this.storage.bucket(this.bucketName);
            await bucket.file(fileName).delete();

            logger.info('File deleted from GCS', { fileName });
        } catch (error) {
            logger.error('GCS Delete Error', { error: error.message, url: fileUrl });
        }
    }
}

export const cloudStorageService = new CloudStorageService();
