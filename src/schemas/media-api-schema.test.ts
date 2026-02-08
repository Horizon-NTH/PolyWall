import { describe, expect, it } from 'vitest';
import { uploadCompleteSchema, uploadIntentSchema } from '@/schemas/media-api-schema';

describe('uploadIntentSchema', () => {
    it('accepts a valid payload', () => {
        const parsed = uploadIntentSchema.safeParse({
            fileName: 'video.mp4',
            mimeType: 'video/mp4',
            fileSizeBytes: 1024,
            title: 'Video',
            description: 'Desc',
            durationSeconds: 12,
        });

        expect(parsed.success).toBe(true);
    });

    it('rejects invalid file size', () => {
        const parsed = uploadIntentSchema.safeParse({
            fileName: 'file.png',
            mimeType: 'image/png',
            fileSizeBytes: 0,
        });

        expect(parsed.success).toBe(false);
    });
});

describe('uploadCompleteSchema', () => {
    it('requires mediaFileId and objectKey', () => {
        const parsed = uploadCompleteSchema.safeParse({
            mediaFileId: '',
            objectKey: '',
        });

        expect(parsed.success).toBe(false);
    });
});
