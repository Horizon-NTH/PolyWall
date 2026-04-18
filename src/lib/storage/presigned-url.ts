import { env } from '@/env';
import { getStorageService } from '@/lib/storage/storage-service';

export type StorageObjectRef = {
    storageBucket: string;
    objectKey: string;
};

export async function presignStorageObjectGetUrl(
    file: StorageObjectRef,
    expiresInSeconds = env.DOWNLOAD_URL_TTL_SECONDS,
) {
    return getStorageService().presignGet({
        bucket: file.storageBucket,
        key: file.objectKey,
        expiresInSeconds,
    });
}

export async function resolveThumbUrl(file: StorageObjectRef | null) {
    if (!file) return null;

    return presignStorageObjectGetUrl(file);
}
