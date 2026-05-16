import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaFileStatus, MediaFileVariant } from '@/generated/prisma/enums';
import { getPrismaMock, mockPrismaModule, resetPrismaMock } from '@/test/mocks/prisma';

type ResolveThumbUrl = typeof import('@/lib/storage/presigned-url')['resolveThumbUrl'];

const mocks = vi.hoisted(() => ({
    resolveThumbUrl: vi.fn(),
}));

mockPrismaModule();

vi.mock('@/lib/storage/presigned-url', () => ({
    resolveThumbUrl: (...args: Parameters<ResolveThumbUrl>) => mocks.resolveThumbUrl(...args),
}));

function mediaFile(overrides: Partial<{
    id: string;
    sourceMediaFileId: string | null;
    status: MediaFileStatus;
    variant: MediaFileVariant;
    variantIndex: number;
    mimeType: string;
    storageBucket: string;
    objectKey: string;
}> = {}) {
    return {
        id: 'file-original',
        sourceMediaFileId: null,
        status: MediaFileStatus.READY,
        variant: MediaFileVariant.ORIGINAL,
        variantIndex: 0,
        mimeType: 'image/png',
        fileSizeBytes: 1024,
        storageBucket: 'media',
        objectKey: 'org/logo.png',
        originalFileName: 'logo.png',
        metaJson: {},
        createdAt: new Date('2026-05-01T10:00:00.000Z'),
        updatedAt: new Date('2026-05-01T10:00:00.000Z'),
        ...overrides,
    };
}

describe('findStaticImageMediaOptions', () => {
    beforeEach(async () => {
        await resetPrismaMock();
        mocks.resolveThumbUrl.mockReset();
        mocks.resolveThumbUrl.mockImplementation(async (file) => file ? `signed://${file.objectKey}` : null);
    });

    it('returns no options and does not query when organization is missing', async () => {
        const {findStaticImageMediaOptions} = await import('@/lib/display-templates/static-media-options');

        await expect(findStaticImageMediaOptions(null)).resolves.toEqual([]);
        await expect(findStaticImageMediaOptions(undefined)).resolves.toEqual([]);

        const prisma = await getPrismaMock();
        expect(prisma.mediaItem.findMany).not.toHaveBeenCalled();
    });

    it('queries active ready image media and resolves thumbnails before originals', async () => {
        const original = mediaFile({id: 'file-original', objectKey: 'org/original.png'});
        const thumb = mediaFile({
            id: 'file-thumb',
            sourceMediaFileId: 'file-original',
            variant: MediaFileVariant.THUMB,
            objectKey: 'org/thumb.png',
        });
        const prisma = await getPrismaMock();
        prisma.mediaItem.findMany.mockResolvedValueOnce([
            {
                id: 'media-1',
                title: 'Logo BDE',
                files: [original, thumb],
            },
            {
                id: 'media-2',
                title: 'Bannière',
                files: [mediaFile({id: 'file-original-2', objectKey: 'org/banner.png'})],
            },
        ]);

        const {findStaticImageMediaOptions} = await import('@/lib/display-templates/static-media-options');
        const result = await findStaticImageMediaOptions('org-1');

        expect(prisma.mediaItem.findMany).toHaveBeenCalledWith({
            where: {
                organizationId: 'org-1',
                active: true,
                files: {
                    some: {
                        status: MediaFileStatus.READY,
                        variant: MediaFileVariant.ORIGINAL,
                        mimeType: {
                            startsWith: 'image/',
                        },
                    },
                },
            },
            orderBy: [
                {title: 'asc'},
                {updatedAt: 'desc'},
            ],
            select: expect.objectContaining({
                id: true,
                title: true,
                files: expect.objectContaining({
                    where: {
                        variant: {
                            in: [MediaFileVariant.ORIGINAL, MediaFileVariant.THUMB],
                        },
                    },
                }),
            }),
        });
        expect(mocks.resolveThumbUrl).toHaveBeenNthCalledWith(1, thumb);
        expect(mocks.resolveThumbUrl).toHaveBeenNthCalledWith(2, expect.objectContaining({id: 'file-original-2'}));
        expect(result).toEqual([
            {id: 'media-1', title: 'Logo BDE', thumbUrl: 'signed://org/thumb.png'},
            {id: 'media-2', title: 'Bannière', thumbUrl: 'signed://org/banner.png'},
        ]);
    });
});
