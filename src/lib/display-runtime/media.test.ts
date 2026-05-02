import { describe, expect, it } from 'vitest';

import { MediaFileStatus, MediaFileVariant } from '@/generated/prisma/enums';
import {
    buildDisplaySequencePlan,
    getDisplaySequenceDurationSeconds,
    type DisplayRuntimeMediaFileLike,
} from '@/lib/display-runtime/media';

describe('display-runtime media helpers', () => {
    it('builds a sequence plan for videos and rendered documents while skipping inactive media', () => {
        const sequence = buildDisplaySequencePlan<DisplayRuntimeMediaFileLike>([
            {
                id: 'playlist-item-video',
                orderIndex: 0,
                mediaItem: {
                    id: 'media-video',
                    title: 'Vidéo principale',
                    active: true,
                    durationSeconds: 12,
                    files: [{
                        id: 'video-original',
                        status: MediaFileStatus.READY,
                        variant: MediaFileVariant.ORIGINAL,
                        variantIndex: 0,
                        sourceMediaFileId: null,
                        mimeType: 'video/mp4',
                        metaJson: {
                            durationSeconds: 14.6,
                            width: 1920,
                            height: 1080,
                        },
                    }],
                },
            },
            {
                id: 'playlist-item-pdf',
                orderIndex: 1,
                mediaItem: {
                    id: 'media-pdf',
                    title: 'Brochure',
                    active: true,
                    durationSeconds: 7,
                    files: [
                        {
                            id: 'pdf-original',
                            status: MediaFileStatus.READY,
                        variant: MediaFileVariant.ORIGINAL,
                        variantIndex: 0,
                        sourceMediaFileId: null,
                        mimeType: 'application/pdf',
                        metaJson: {
                            width: 1080,
                            height: 1920,
                        },
                        },
                        {
                            id: 'render-2',
                            status: MediaFileStatus.READY,
                            variant: MediaFileVariant.RENDER,
                            variantIndex: 2,
                            sourceMediaFileId: 'pdf-original',
                            mimeType: 'image/jpeg',
                            metaJson: {},
                        },
                        {
                            id: 'render-1',
                            status: MediaFileStatus.READY,
                            variant: MediaFileVariant.RENDER,
                            variantIndex: 1,
                            sourceMediaFileId: 'pdf-original',
                            mimeType: 'image/jpeg',
                            metaJson: {},
                        },
                    ],
                },
            },
            {
                id: 'playlist-item-inactive',
                orderIndex: 2,
                mediaItem: {
                    id: 'media-inactive',
                    title: 'Inactive',
                    active: false,
                    durationSeconds: 5,
                    files: [{
                        id: 'inactive-original',
                        status: MediaFileStatus.READY,
                        variant: MediaFileVariant.ORIGINAL,
                        variantIndex: 0,
                        sourceMediaFileId: null,
                        mimeType: 'image/png',
                        metaJson: {},
                    }],
                },
            },
        ]);

        expect(sequence).toHaveLength(3);
        expect(sequence[0]).toMatchObject({
            mediaKind: 'video',
            durationSeconds: 15,
            width: 1920,
            height: 1080,
        });
        expect(sequence[1]?.frameIndex).toBe(1);
        expect(sequence[2]?.frameIndex).toBe(2);
        expect(sequence[1]?.durationSeconds).toBe(7);
    });

    it('computes the total sequence duration', () => {
        expect(getDisplaySequenceDurationSeconds([
            {durationSeconds: 10},
            {durationSeconds: 20},
            {durationSeconds: 5},
        ])).toBe(35);
    });
});
