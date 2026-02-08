import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => {
    const logger = {
        success: vi.fn(),
        invalid: vi.fn(),
        denied: vi.fn(),
        error: vi.fn(),
    };

    return {
        auth: vi.fn(),
        prisma: {
            organization: {findUnique: vi.fn()},
            mediaItem: {
                findFirst: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
            },
            mediaFile: {
                create: vi.fn(),
                findUnique: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
                count: vi.fn(),
            },
        },
        storage: {
            presignPut: vi.fn(),
            presignGet: vi.fn(),
            headObject: vi.fn(),
            deleteObject: vi.fn(),
            getObjectSample: vi.fn(),
            getObjectToFile: vi.fn(),
            putObject: vi.fn(),
            copyObject: vi.fn(),
        },
        enqueueMediaProcessing: vi.fn(),
        fileTypeFromBuffer: vi.fn(),
        createActionLogger: vi.fn(() => logger),
        logger,
    };
});

vi.mock('@/env', () => ({
    env: {
        STORAGE_DRIVER: 's3',
        S3_ENDPOINT: 'http://localhost:9000',
        S3_REGION: 'eu-west-3',
        S3_BUCKET: 'polywall-dev',
        S3_ACCESS_KEY_ID: 'polywall',
        S3_SECRET_ACCESS_KEY: 'polywallsecret',
        S3_FORCE_PATH_STYLE: true,
        S3_PUBLIC_BASE_URL: undefined,
        UPLOAD_MAX_BYTES: 1024 * 1024,
        UPLOAD_URL_TTL_SECONDS: 900,
        DOWNLOAD_URL_TTL_SECONDS: 300,
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db?schema=public',
        AUTH_SECRET: 'test-secret',
        AUTH_TRUST_HOST: false,
        AUTH_URL: 'http://localhost:3000',
        LOG_LEVEL: 'silent',
        LOG_PRETTY: false,
        REDIS_URL: 'redis://localhost:6379',
        RATE_LIMIT_DISABLED: false,
    },
}));

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/lib/prisma', () => ({
    prisma: mocks.prisma,
}));

vi.mock('@/lib/storage/storage-service', () => ({
    getStorageService: () => mocks.storage,
}));

vi.mock('@/lib/queues/media-processing-queue', () => ({
    enqueueMediaProcessing: mocks.enqueueMediaProcessing,
}));

vi.mock('file-type', () => ({
    fileTypeFromBuffer: mocks.fileTypeFromBuffer,
}));

vi.mock('@/actions/action-logging', () => ({
    createActionLogger: mocks.createActionLogger,
}));

function buildSession(overrides?: {
    role?: UserRole;
    organizationId?: string | null;
}) {
    return {
        user: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'User Example',
            role: overrides?.role ?? UserRole.ORGANIZATION_ADMIN,
            organizationId: overrides?.organizationId ?? 'org-1',
        },
        expires: new Date().toISOString(),
    };
}

describe('media API routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/media/upload-intents', () => {
        it('returns 401 when unauthenticated', async () => {
            mocks.auth.mockResolvedValueOnce(null);
            const mod = await import('@/app/api/media/upload-intents/route');

            const response = await mod.POST(
                new Request('http://localhost/api/media/upload-intents', {
                    method: 'POST',
                    body: JSON.stringify({}),
                }),
            );

            expect(response.status).toBe(401);
        });

        it('creates upload intent and returns presigned url', async () => {
            mocks.auth.mockResolvedValueOnce(buildSession());
            mocks.prisma.organization.findUnique.mockResolvedValueOnce({id: 'org-1'});
            mocks.prisma.mediaItem.create.mockResolvedValueOnce({id: 'mi-1', organizationId: 'org-1'});
            mocks.prisma.mediaFile.create.mockResolvedValueOnce({
                id: 'mf-1',
                objectKey: 'org/org-1/media/mi-1/original/file.png',
                storageBucket: 'polywall-dev',
            });
            mocks.storage.presignPut.mockResolvedValueOnce('https://upload-url');

            const mod = await import('@/app/api/media/upload-intents/route');
            const response = await mod.POST(
                new Request('http://localhost/api/media/upload-intents', {
                    method: 'POST',
                    body: JSON.stringify({
                        fileName: 'file.png',
                        mimeType: 'image/png',
                        fileSizeBytes: 100,
                    }),
                }),
            );

            const json = await response.json();

            expect(response.status).toBe(201);
            expect(json.uploadUrl).toBe('https://upload-url');
            expect(mocks.prisma.mediaFile.create).toHaveBeenCalledTimes(1);
            expect(mocks.storage.presignPut).toHaveBeenCalledTimes(1);
        });
    });

    describe('POST /api/media/upload-complete', () => {
        it('returns 400 when mime cannot be detected from content', async () => {
            mocks.auth.mockResolvedValueOnce(buildSession());
            mocks.prisma.mediaFile.findUnique.mockResolvedValueOnce({
                id: 'mf-1',
                objectKey: 'obj-key',
                storageBucket: 'polywall-dev',
                mimeType: 'image/png',
                mediaItem: {id: 'mi-1', organizationId: 'org-1'},
            });
            mocks.storage.headObject.mockResolvedValueOnce({
                contentLength: 123,
                contentType: 'image/png',
                etag: 'etag',
            });
            mocks.storage.getObjectSample.mockResolvedValueOnce(Buffer.from('fake'));
            mocks.fileTypeFromBuffer.mockResolvedValueOnce(undefined);

            const mod = await import('@/app/api/media/upload-complete/route');
            const response = await mod.POST(
                new Request('http://localhost/api/media/upload-complete', {
                    method: 'POST',
                    body: JSON.stringify({
                        mediaFileId: 'mf-1',
                        objectKey: 'obj-key',
                    }),
                }),
            );

            expect(response.status).toBe(400);
            expect(mocks.prisma.mediaFile.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({status: 'FAILED'}),
                }),
            );
            expect(mocks.enqueueMediaProcessing).not.toHaveBeenCalled();
        });

        it('returns 400 when detected mime is not allowed', async () => {
            mocks.auth.mockResolvedValueOnce(buildSession());
            mocks.prisma.mediaFile.findUnique.mockResolvedValueOnce({
                id: 'mf-1',
                objectKey: 'obj-key',
                storageBucket: 'polywall-dev',
                mimeType: 'image/png',
                mediaItem: {id: 'mi-1', organizationId: 'org-1'},
            });
            mocks.storage.headObject.mockResolvedValueOnce({
                contentLength: 123,
                contentType: 'application/octet-stream',
                etag: 'etag',
            });
            mocks.storage.getObjectSample.mockResolvedValueOnce(Buffer.from('fake'));
            mocks.fileTypeFromBuffer.mockResolvedValueOnce({mime: 'application/zip'});

            const mod = await import('@/app/api/media/upload-complete/route');
            const response = await mod.POST(
                new Request('http://localhost/api/media/upload-complete', {
                    method: 'POST',
                    body: JSON.stringify({
                        mediaFileId: 'mf-1',
                        objectKey: 'obj-key',
                    }),
                }),
            );

            expect(response.status).toBe(400);
            expect(mocks.prisma.mediaFile.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({status: 'FAILED'}),
                }),
            );
            expect(mocks.enqueueMediaProcessing).not.toHaveBeenCalled();
        });

        it('marks file READY and enqueues processing', async () => {
            mocks.auth.mockResolvedValueOnce(buildSession());
            mocks.prisma.mediaFile.findUnique.mockResolvedValueOnce({
                id: 'mf-1',
                objectKey: 'obj-key',
                storageBucket: 'polywall-dev',
                mimeType: 'image/png',
                mediaItem: {id: 'mi-1', organizationId: 'org-1'},
            });
            mocks.storage.headObject.mockResolvedValueOnce({
                contentLength: 222,
                contentType: 'image/png',
                etag: 'etag',
            });
            mocks.storage.getObjectSample.mockResolvedValueOnce(Buffer.from('fake'));
            mocks.fileTypeFromBuffer.mockResolvedValueOnce({mime: 'image/png'});

            const mod = await import('@/app/api/media/upload-complete/route');
            const response = await mod.POST(
                new Request('http://localhost/api/media/upload-complete', {
                    method: 'POST',
                    body: JSON.stringify({
                        mediaFileId: 'mf-1',
                        objectKey: 'obj-key',
                    }),
                }),
            );

            expect(response.status).toBe(200);
            expect(mocks.enqueueMediaProcessing).toHaveBeenCalledWith({
                mediaFileId: 'mf-1',
                organizationId: 'org-1',
            });
            expect(mocks.prisma.mediaFile.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({status: 'UPLOADED', mimeType: 'image/png'}),
                }),
            );
        });
    });

    describe('GET /api/media/:mediaFileId/download-url', () => {
        it('returns 409 if media is not READY', async () => {
            mocks.auth.mockResolvedValueOnce(buildSession());
            mocks.prisma.mediaFile.findUnique.mockResolvedValueOnce({
                id: 'mf-1',
                status: 'AWAITING_UPLOAD',
                storageBucket: 'polywall-dev',
                objectKey: 'obj-key',
                mediaItem: {organizationId: 'org-1'},
            });

            const mod = await import('@/app/api/media/[mediaFileId]/download-url/route');
            const response = await mod.GET(new Request('http://localhost'), {
                params: Promise.resolve({mediaFileId: 'mf-1'}),
            });

            expect(response.status).toBe(409);
            expect(mocks.storage.presignGet).not.toHaveBeenCalled();
        });

        it('returns signed download URL when uploaded', async () => {
            mocks.auth.mockResolvedValueOnce(buildSession());
            mocks.prisma.mediaFile.findUnique.mockResolvedValueOnce({
                id: 'mf-1',
                status: 'UPLOADED',
                storageBucket: 'polywall-dev',
                objectKey: 'obj-key',
                mediaItem: {organizationId: 'org-1'},
            });
            mocks.storage.presignGet.mockResolvedValueOnce('https://download-url');

            const mod = await import('@/app/api/media/[mediaFileId]/download-url/route');
            const response = await mod.GET(new Request('http://localhost'), {
                params: Promise.resolve({mediaFileId: 'mf-1'}),
            });
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.downloadUrl).toBe('https://download-url');
        });
    });

    describe('DELETE /api/media/:mediaFileId', () => {
        it('returns 403 when organization does not match', async () => {
            mocks.auth.mockResolvedValueOnce(buildSession({organizationId: 'org-2'}));
            mocks.prisma.mediaFile.findUnique.mockResolvedValueOnce({
                id: 'mf-1',
                storageBucket: 'polywall-dev',
                objectKey: 'obj-key',
                mediaItemId: 'mi-1',
                mediaItem: {organizationId: 'org-1'},
            });

            const mod = await import('@/app/api/media/[mediaFileId]/route');
            const response = await mod.DELETE(new Request('http://localhost'), {
                params: Promise.resolve({mediaFileId: 'mf-1'}),
            });

            expect(response.status).toBe(403);
        });

        it('deletes file and deactivates media when last file is removed', async () => {
            mocks.auth.mockResolvedValueOnce(buildSession());
            mocks.prisma.mediaFile.findUnique.mockResolvedValueOnce({
                id: 'mf-1',
                storageBucket: 'polywall-dev',
                objectKey: 'obj-key',
                mediaItemId: 'mi-1',
                mediaItem: {organizationId: 'org-1'},
            });
            mocks.prisma.mediaFile.count.mockResolvedValueOnce(0);

            const mod = await import('@/app/api/media/[mediaFileId]/route');
            const response = await mod.DELETE(new Request('http://localhost'), {
                params: Promise.resolve({mediaFileId: 'mf-1'}),
            });

            expect(response.status).toBe(200);
            expect(mocks.storage.deleteObject).toHaveBeenCalledWith('polywall-dev', 'obj-key');
            expect(mocks.prisma.mediaFile.delete).toHaveBeenCalledWith({where: {id: 'mf-1'}});
            expect(mocks.prisma.mediaItem.update).toHaveBeenCalledWith({
                where: {id: 'mi-1'},
                data: {active: false},
            });
        });
    });
});
