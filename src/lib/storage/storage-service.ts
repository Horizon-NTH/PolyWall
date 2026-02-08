import { env } from '@/env';
import { S3StorageService } from '@/lib/storage/s3-storage-service';
import type { StorageService } from '@/lib/storage/types';

let instance: StorageService | null = null;

export function getStorageService(): StorageService {
    if (instance) return instance;

    if (env.STORAGE_DRIVER !== 's3') {
        throw new Error(`Unsupported storage driver: ${env.STORAGE_DRIVER}`);
    }

    instance = new S3StorageService();
    return instance;
}
