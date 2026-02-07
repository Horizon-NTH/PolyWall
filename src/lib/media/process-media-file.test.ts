import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnrecoverableError } from 'bullmq';
import { processMediaFile } from '@/lib/media/process-media-file';

const mocks = vi.hoisted(() => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
    prisma: {
        mediaFile: {
            findUnique: vi.fn(),
            updateMany: vi.fn(),
            update: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
        },
        mediaItem: {
            update: vi.fn(),
        },
    },
    storage: {
        headObject: vi.fn(),
        getObjectToFile: vi.fn(),
        putObject: vi.fn(),
    },
    execa: vi.fn(),
}));

vi.mock('execa', () => ({
    $: () => (strings: TemplateStringsArray, ...values: unknown[]) =>
        mocks.execa(strings, ...values),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: mocks.prisma,
}));

vi.mock('@/lib/logger', () => ({
    logger: mocks.logger,
}));

vi.mock('@/lib/storage/storage-service', () => ({
    getStorageService: () => mocks.storage,
}));

vi.mock('@/lib/media/media-constraints', async () => {
    const actual = await vi.importActual<typeof import('@/lib/media/media-constraints')>(
        '@/lib/media/media-constraints',
    );

    return {
        ...actual,
        isPresentationMimeType: vi.fn(() => false),
    };
});

function buildMediaFile(overrides?: Partial<{
    status: 'UPLOADED' | 'READY' | 'FAILED' | 'PROCESSING' | 'AWAITING_UPLOAD';
    mimeType: string;
    objectKey: string;
    organizationId: string;
}>) {
    return {
        id: 'mf-1',
        status: overrides?.status ?? 'UPLOADED',
        metaJson: null,
        mimeType: overrides?.mimeType ?? 'image/png',
        storageBucket: 'polywall-dev',
        objectKey: overrides?.objectKey ?? 'org/org-1/media/mi-1/original/file.png',
        mediaItemId: 'mi-1',
        mediaItem: {
            organizationId: overrides?.organizationId ?? 'org-1',
        },
    };
}

function flattenCommand(strings: TemplateStringsArray, values: unknown[]) {
    let command = strings[0] ?? '';
    for (let idx = 0; idx < values.length; idx += 1) {
        command += String(values[idx]) + (strings[idx + 1] ?? '');
    }
    return command.trim().replace(/\s+/g, ' ');
}

describe('processMediaFile', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.storage.headObject.mockResolvedValue({
            contentLength: 120,
            contentType: 'image/png',
            etag: 'etag',
        });
        mocks.storage.getObjectToFile.mockResolvedValue(undefined);
        mocks.storage.putObject.mockResolvedValue(undefined);

        mocks.prisma.mediaFile.updateMany.mockResolvedValue({count: 1});
        mocks.prisma.mediaFile.update.mockResolvedValue({});
        mocks.prisma.mediaFile.findFirst.mockResolvedValue(null);
        mocks.prisma.mediaFile.create.mockResolvedValue({});
        mocks.prisma.mediaItem.update.mockResolvedValue({});

        mocks.execa.mockImplementation(
            async (strings: TemplateStringsArray, ...values: unknown[]) => {
                const command = flattenCommand(strings, values);
                if (command.startsWith('ffmpeg -hide_banner -encoders')) {
                    return {stdout: ' V..... libwebp WebP image'};
                }
                if (command.startsWith('ffprobe ')) {
                    return {
                        stdout: JSON.stringify({
                            streams: [
                                {
                                    codec_type: 'video',
                                    width: 800,
                                    height: 600,
                                    codec_name: 'png',
                                },
                            ],
                            format: {},
                        }),
                    };
                }
                return {stdout: ''};
            },
        );
    });

    it('returns without failure when media is missing', async () => {
        mocks.prisma.mediaFile.findUnique.mockResolvedValueOnce(null);

        await expect(
            processMediaFile({mediaFileId: 'mf-1', organizationId: 'org-1'}),
        ).resolves.toBeUndefined();

        expect(mocks.logger.warn).toHaveBeenCalledTimes(1);
        expect(mocks.prisma.mediaFile.update).not.toHaveBeenCalled();
    });

    it('skips processing when status is READY', async () => {
        mocks.prisma.mediaFile.findUnique.mockResolvedValueOnce(
            buildMediaFile({status: 'READY'}),
        );

        await expect(
            processMediaFile({mediaFileId: 'mf-1', organizationId: 'org-1'}),
        ).resolves.toBeUndefined();

        expect(mocks.prisma.mediaFile.updateMany).not.toHaveBeenCalled();
    });

    it('fails immediately when organization does not match', async () => {
        mocks.prisma.mediaFile.findUnique.mockResolvedValueOnce(
            buildMediaFile({organizationId: 'org-2'}),
        );

        await expect(
            processMediaFile({mediaFileId: 'mf-1', organizationId: 'org-1'}),
        ).rejects.toThrow(UnrecoverableError);

        expect(mocks.prisma.mediaFile.update).not.toHaveBeenCalled();
    });

    it('marks retry pending on transient storage error', async () => {
        mocks.prisma.mediaFile.findUnique.mockResolvedValueOnce(buildMediaFile());
        mocks.storage.headObject.mockRejectedValueOnce(new Error('S3 unavailable'));

        await expect(
            processMediaFile({mediaFileId: 'mf-1', organizationId: 'org-1'}),
        ).rejects.toThrow('S3 unavailable');

        expect(mocks.prisma.mediaFile.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: 'UPLOADED',
                    metaJson: expect.objectContaining({
                        processing: expect.objectContaining({
                            status: 'RETRY_PENDING',
                            error: expect.objectContaining({kind: 'transient'}),
                        }),
                    }),
                }),
            }),
        );
    });

    it('marks failed on unsupported mime type', async () => {
        mocks.prisma.mediaFile.findUnique.mockResolvedValueOnce(
            buildMediaFile({mimeType: 'application/octet-stream'}),
        );

        await expect(
            processMediaFile({mediaFileId: 'mf-1', organizationId: 'org-1'}),
        ).rejects.toThrow('Unsupported mime type for processing: application/octet-stream');

        expect(mocks.prisma.mediaFile.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: 'FAILED',
                    metaJson: expect.objectContaining({
                        processing: expect.objectContaining({
                            status: 'FAILED',
                            error: expect.objectContaining({kind: 'functional'}),
                        }),
                    }),
                }),
            }),
        );
    });

    it('falls back to jpeg when libwebp encoder is unavailable', async () => {
        mocks.prisma.mediaFile.findUnique.mockResolvedValueOnce(buildMediaFile({mimeType: 'video/mp4'}));

        mocks.execa.mockImplementation(
            async (strings: TemplateStringsArray, ...values: unknown[]) => {
                const command = flattenCommand(strings, values);
                if (command.startsWith('ffmpeg -hide_banner -encoders')) {
                    return {stdout: ' V..... h264 H.264'};
                }
                if (command.startsWith('ffprobe ')) {
                    return {
                        stdout: JSON.stringify({
                            streams: [
                                {
                                    codec_type: 'video',
                                    width: 800,
                                    height: 600,
                                    codec_name: 'h264',
                                    duration: '8.5',
                                },
                            ],
                            format: {duration: '8.5'},
                        }),
                    };
                }
                if (command.includes('-c:v mjpeg')) {
                    throw new Error('render failed');
                }
                return {stdout: ''};
            },
        );

        await expect(
            processMediaFile({mediaFileId: 'mf-1', organizationId: 'org-1'}),
        ).rejects.toThrow('render failed');

        const calledCommands = mocks.execa.mock.calls.map(([strings, ...values]) =>
            flattenCommand(strings as TemplateStringsArray, values),
        );
        expect(calledCommands.some((command) => command.includes('-c:v mjpeg'))).toBe(true);
        expect(mocks.prisma.mediaFile.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: 'UPLOADED',
                    metaJson: expect.objectContaining({
                        processing: expect.objectContaining({
                            status: 'RETRY_PENDING',
                            error: expect.objectContaining({kind: 'transient'}),
                        }),
                    }),
                }),
            }),
        );
    });
});
