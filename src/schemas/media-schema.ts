import { z } from 'zod';
import { MAX_FILE_SIZE_BYTES } from '@/schemas/media-api-schema';

export const MAX_MEDIA_DURATION_SECONDS = 24 * 3600;

const mediaBaseSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, 'Le titre est requis.')
        .max(120, 'Le titre doit contenir au maximum 120 caractères.'),
    description: z
        .string()
        .trim()
        .min(1, 'La description est requise.')
        .max(500, 'La description doit contenir au maximum 500 caractères.'),
    durationSeconds: z
        .number({error: 'La durée est requise.'})
        .int('La durée doit être un entier.')
        .positive('La durée doit être supérieure à 0.')
        .max(MAX_MEDIA_DURATION_SECONDS, 'La durée doit être inférieure à 24h.'),
    active: z.boolean().default(true),
});

function isFileLike(value: unknown): value is File {
    return (
        typeof value === 'object' &&
        value !== null &&
        'name' in value &&
        'size' in value &&
        'type' in value
    );
}

const fileSchema = z
    .custom<File>((value) => isFileLike(value), {
        message: 'Le fichier est requis.',
    })
    .refine((file) => file.size > 0, {
        message: 'Le fichier est vide.',
    })
    .refine((file) => file.size <= MAX_FILE_SIZE_BYTES, {
        message: 'Le fichier dépasse la taille maximale autorisée.',
    });

export const mediaCreateSchema = mediaBaseSchema.extend({
    file: fileSchema,
});

export const mediaUpdateSchema = mediaBaseSchema;

export const mediaListFilterSchema = z.object({
    q: z.string().trim().default(''),
    type: z.enum(['all', 'image', 'video', 'pdf', 'presentation', 'other']).default('all'),
    status: z
        .enum(['all', 'awaiting_upload', 'uploaded', 'processing', 'ready', 'failed'])
        .default('all'),
    active: z.enum(['all', 'active', 'inactive']).default('all'),
    sort: z
        .enum([
            'updatedAt-desc',
            'updatedAt-asc',
            'createdAt-desc',
            'createdAt-asc',
            'title-asc',
            'title-desc',
            'size-desc',
            'size-asc',
        ])
        .default('updatedAt-desc'),
});

export type MediaUpdateValues = z.infer<typeof mediaUpdateSchema>;
export type MediaListFilterValues = z.infer<typeof mediaListFilterSchema>;
