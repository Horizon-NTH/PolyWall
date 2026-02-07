import { describe, expect, it } from 'vitest';

import { MediaFileStatus, MediaFileVariant } from '@/generated/prisma/enums';
import {
    asRecord,
    extractMediaMetaSummary,
    getMediaKindFromMimeType,
    getMediaKindLabel,
    getMediaStatusLabel,
    selectPrimaryOriginalFile,
    selectRenderFiles,
    selectThumbFile,
    toNumberFileSize,
    type MediaFileLike,
} from '@/lib/media/media-view-model';

function buildFile(overrides?: Partial<MediaFileLike>): MediaFileLike {
    return {
        id: 'file-1',
        sourceMediaFileId: null,
        status: MediaFileStatus.READY,
        variant: MediaFileVariant.ORIGINAL,
        variantIndex: 0,
        mimeType: 'image/png',
        fileSizeBytes: BigInt(123),
        storageBucket: 'bucket',
        objectKey: 'org/org-1/media/m-1/original/file.png',
        originalFileName: 'file.png',
        metaJson: null,
        createdAt: new Date('2026-02-01T10:00:00.000Z'),
        updatedAt: new Date('2026-02-01T10:00:00.000Z'),
        ...overrides,
    };
}

describe('media-view-model', () => {
    it('maps mime types to media kind', () => {
        expect(getMediaKindFromMimeType('image/png')).toBe('image');
        expect(getMediaKindFromMimeType('video/mp4')).toBe('video');
        expect(getMediaKindFromMimeType('application/pdf')).toBe('pdf');
        expect(
            getMediaKindFromMimeType(
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            ),
        ).toBe('presentation');
        expect(getMediaKindFromMimeType('application/octet-stream')).toBe('other');
    });

    it('returns labels for kinds and statuses', () => {
        expect(getMediaKindLabel('image')).toBe('Image');
        expect(getMediaKindLabel('presentation')).toBe('Présentation');
        expect(getMediaStatusLabel(MediaFileStatus.AWAITING_UPLOAD)).toBe('En attente d\'upload');
        expect(getMediaStatusLabel(MediaFileStatus.FAILED)).toBe('En erreur');
    });

    it('selects primary original, thumb, and render files', () => {
        const original = buildFile({id: 'original-1'});
        const original2 = buildFile({id: 'original-2'});
        const readyThumb = buildFile({
            id: 'thumb-1',
            variant: MediaFileVariant.THUMB,
            sourceMediaFileId: 'original-1',
            variantIndex: 0,
            status: MediaFileStatus.READY,
        });
        const processingThumb = buildFile({
            id: 'thumb-2',
            variant: MediaFileVariant.THUMB,
            sourceMediaFileId: 'original-1',
            variantIndex: 0,
            status: MediaFileStatus.PROCESSING,
        });
        const render2 = buildFile({
            id: 'render-2',
            variant: MediaFileVariant.RENDER,
            sourceMediaFileId: 'original-1',
            variantIndex: 2,
            status: MediaFileStatus.READY,
        });
        const render1 = buildFile({
            id: 'render-1',
            variant: MediaFileVariant.RENDER,
            sourceMediaFileId: 'original-1',
            variantIndex: 1,
            status: MediaFileStatus.READY,
        });
        const renderOther = buildFile({
            id: 'render-other',
            variant: MediaFileVariant.RENDER,
            sourceMediaFileId: 'original-2',
            variantIndex: 0,
            status: MediaFileStatus.READY,
        });

        const files = [readyThumb, render2, original, processingThumb, render1, renderOther, original2];

        expect(selectPrimaryOriginalFile(files)?.id).toBe('original-1');
        expect(selectThumbFile(files, 'original-1')?.id).toBe('thumb-1');
        expect(selectThumbFile(files, 'original-2')).toBeNull();
        expect(selectRenderFiles(files, 'original-1').map((file) => file.id)).toEqual(['render-1', 'render-2']);
    });

    it('converts file size values', () => {
        expect(toNumberFileSize(42)).toBe(42);
        expect(toNumberFileSize(BigInt(99))).toBe(99);
    });

    it('casts records and extracts metadata summary', () => {
        expect(asRecord(null)).toEqual({});
        expect(asRecord(['array'])).toEqual({});
        expect(asRecord({width: 1920})).toEqual({width: 1920});

        expect(
            extractMediaMetaSummary({
                width: 1920,
                height: 1080,
                durationSeconds: 30,
                pageCount: 4,
                slideCount: 8,
                codec: 'h264',
                detectedMimeType: 'video/mp4',
            }),
        ).toEqual({
            width: 1920,
            height: 1080,
            durationSeconds: 30,
            pageCount: 4,
            slideCount: 8,
            codec: 'h264',
            detectedMimeType: 'video/mp4',
        });

        expect(extractMediaMetaSummary({width: 'nope', codec: 12})).toEqual({
            width: null,
            height: null,
            durationSeconds: null,
            pageCount: null,
            slideCount: null,
            codec: null,
            detectedMimeType: null,
        });
    });
});
