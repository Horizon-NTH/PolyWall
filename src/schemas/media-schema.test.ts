import { describe, expect, it } from 'vitest';
import { mediaCreateSchema, mediaListFilterSchema, mediaUpdateSchema } from '@/schemas/media-schema';

describe('mediaCreateSchema', () => {
    it('accepts a valid payload', () => {
        const parsed = mediaCreateSchema.safeParse({
            title: 'Affiche rentrée',
            description: 'Affiche principale de la semaine',
            durationSeconds: 12,
            active: true,
            file: new File(['hello'], 'affiche.png', {type: 'image/png'}),
        });

        expect(parsed.success).toBe(true);
    });

    it('rejects invalid payload', () => {
        const parsed = mediaCreateSchema.safeParse({
            title: '',
            description: '',
            durationSeconds: 0,
            active: true,
            file: undefined,
        });

        expect(parsed.success).toBe(false);
    });
});

describe('mediaUpdateSchema', () => {
    it('rejects invalid duration', () => {
        const parsed = mediaUpdateSchema.safeParse({
            title: 'Titre',
            description: 'Description valide',
            durationSeconds: 0,
            active: true,
        });

        expect(parsed.success).toBe(false);
    });
});

describe('mediaListFilterSchema', () => {
    it('applies defaults', () => {
        const parsed = mediaListFilterSchema.parse({});

        expect(parsed).toEqual({
            q: '',
            type: 'all',
            status: 'all',
            active: 'all',
            sort: 'updatedAt-desc',
        });
    });
});
