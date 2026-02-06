import { describe, expect, it } from 'vitest';
import { inferDefaultDurationSeconds, isAllowedMediaMimeType } from '@/lib/media/media-constraints';

describe('media constraints', () => {
    it('accepts supported mime types', () => {
        expect(isAllowedMediaMimeType('image/jpeg')).toBe(true);
        expect(isAllowedMediaMimeType('video/mp4')).toBe(true);
        expect(isAllowedMediaMimeType('application/pdf')).toBe(true);
    });

    it('rejects unsupported mime types', () => {
        expect(isAllowedMediaMimeType('application/zip')).toBe(false);
    });

    it('infers default durations by mime', () => {
        expect(inferDefaultDurationSeconds('video/mp4')).toBe(60);
        expect(inferDefaultDurationSeconds('application/pdf')).toBe(15);
        expect(inferDefaultDurationSeconds('image/png')).toBe(10);
    });
});
