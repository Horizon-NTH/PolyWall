import {
    CopyObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/env';
import type { HeadObjectResult, PresignGetParams, PresignPutParams, StorageService } from '@/lib/storage/types';

export class S3StorageService implements StorageService {
    private readonly client: S3Client;
    private readonly presignClient: S3Client;

    constructor() {
        const sharedConfig = {
            region: env.S3_REGION,
            forcePathStyle: env.S3_FORCE_PATH_STYLE ?? true,
            credentials: {
                accessKeyId: env.S3_ACCESS_KEY_ID,
                secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            },
        };

        this.client = new S3Client({
            ...sharedConfig,
            endpoint: env.S3_ENDPOINT,
        });

        this.presignClient = new S3Client({
            ...sharedConfig,
            endpoint: env.S3_PUBLIC_BASE_URL ?? env.S3_ENDPOINT,
        });
    }

    async putObject(params: {
        bucket: string;
        key: string;
        body: Buffer | Uint8Array | string;
        contentType: string;
    }) {
        await this.client.send(
            new PutObjectCommand({
                Bucket: params.bucket,
                Key: params.key,
                Body: params.body,
                ContentType: params.contentType,
            }),
        );
    }

    async presignPut(params: PresignPutParams) {
        const command = new PutObjectCommand({
            Bucket: params.bucket,
            Key: params.key,
            ContentType: params.contentType,
            ContentLength: params.contentLength,
        });

        return getSignedUrl(this.presignClient, command, {
            expiresIn: params.expiresInSeconds,
        });
    }

    async presignGet(params: PresignGetParams) {
        const command = new GetObjectCommand({
            Bucket: params.bucket,
            Key: params.key,
        });

        return getSignedUrl(this.presignClient, command, {
            expiresIn: params.expiresInSeconds,
        });
    }

    async headObject(bucket: string, key: string): Promise<HeadObjectResult | null> {
        try {
            const response = await this.client.send(
                new HeadObjectCommand({
                    Bucket: bucket,
                    Key: key,
                }),
            );

            return {
                contentLength: response.ContentLength ?? null,
                contentType: response.ContentType ?? null,
                etag: response.ETag ?? null,
            };
        } catch {
            return null;
        }
    }

    async deleteObject(bucket: string, key: string) {
        await this.client.send(
            new DeleteObjectCommand({
                Bucket: bucket,
                Key: key,
            }),
        );
    }

    async getObjectSample(bucket: string, key: string, maxBytes: number) {
        try {
            const response = await this.client.send(
                new GetObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Range: `bytes=0-${Math.max(0, maxBytes - 1)}`,
                }),
            );

            if (!response.Body) return null;
            const bytes = await response.Body.transformToByteArray();
            return Buffer.from(bytes);
        } catch {
            return null;
        }
    }

    async getObjectToFile(params: {
        bucket: string;
        key: string;
        filePath: string;
    }) {
        const response = await this.client.send(
            new GetObjectCommand({
                Bucket: params.bucket,
                Key: params.key,
            }),
        );

        if (!response.Body) {
            throw new Error('S3 object has no body.');
        }

        await mkdir(dirname(params.filePath), {recursive: true});
        const bytes = await response.Body.transformToByteArray();
        await writeFile(params.filePath, bytes);
    }

    async copyObject(params: {
        bucket: string;
        sourceKey: string;
        destinationKey: string;
    }) {
        await this.client.send(
            new CopyObjectCommand({
                Bucket: params.bucket,
                Key: params.destinationKey,
                CopySource: `${params.bucket}/${params.sourceKey}`,
            }),
        );
    }
}
