import { describe, expect, it } from 'vitest';
import {
    playlistCreateSchema,
    playlistListFilterSchema,
    playlistTimelineReplaceSchema,
    playlistUpdateSchema,
} from '@/schemas/playlist-schema';

describe('playlistCreateSchema', () => {
    it('accepts valid payload', () => {
        const parsed = playlistCreateSchema.safeParse({
            name: 'Default',
            description: 'Playlist principale',
        });

        expect(parsed.success).toBe(true);
    });

    it('rejects invalid payload', () => {
        const parsed = playlistCreateSchema.safeParse({
            name: '',
            description: '',
        });

        expect(parsed.success).toBe(false);
    });
});

describe('playlistUpdateSchema', () => {
    it('rejects too long name', () => {
        const parsed = playlistUpdateSchema.safeParse({
            name: 'a'.repeat(121),
            description: 'Description valide',
        });

        expect(parsed.success).toBe(false);
    });
});

describe('playlistTimelineReplaceSchema', () => {
    it('accepts duplicates', () => {
        const parsed = playlistTimelineReplaceSchema.safeParse({
            items: [{mediaItemId: 'media-1'}, {mediaItemId: 'media-1'}],
        });

        expect(parsed.success).toBe(true);
    });

    it('rejects empty media ids', () => {
        const parsed = playlistTimelineReplaceSchema.safeParse({
            items: [{mediaItemId: ''}],
        });

        expect(parsed.success).toBe(false);
    });
});

describe('playlistListFilterSchema', () => {
    it('applies defaults', () => {
        const parsed = playlistListFilterSchema.parse({});

        expect(parsed).toEqual({
            q: '',
            inactive: 'all',
            sort: 'updatedAt-desc',
        });
    });
});
