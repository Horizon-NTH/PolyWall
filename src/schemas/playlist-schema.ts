import { z } from 'zod';

const playlistBaseSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Le nom est requis.')
        .max(120, 'Le nom doit contenir au maximum 120 caractères.'),
    description: z
        .string()
        .trim()
        .min(1, 'La description est requise.')
        .max(500, 'La description doit contenir au maximum 500 caractères.'),
});

export const playlistCreateSchema = playlistBaseSchema;
export const playlistUpdateSchema = playlistBaseSchema;

export const playlistTimelineItemSchema = z.object({
    mediaItemId: z.string().trim().min(1, 'Le média est requis.'),
});

export const playlistTimelineReplaceSchema = z.object({
    items: z.array(playlistTimelineItemSchema),
});

export const playlistListFilterSchema = z.object({
    q: z.string().trim().default(''),
    inactive: z.enum(['all', 'with-inactive', 'without-inactive']).default('all'),
    sort: z
        .enum([
            'updatedAt-desc',
            'updatedAt-asc',
            'createdAt-desc',
            'createdAt-asc',
            'name-asc',
            'name-desc',
            'mediaCount-desc',
            'mediaCount-asc',
            'duration-desc',
            'duration-asc',
        ])
        .default('updatedAt-desc'),
});

export type PlaylistCreateValues = z.infer<typeof playlistCreateSchema>;
export type PlaylistUpdateValues = z.infer<typeof playlistUpdateSchema>;
export type PlaylistTimelineReplaceValues = z.infer<typeof playlistTimelineReplaceSchema>;
export type PlaylistListFilterValues = z.infer<typeof playlistListFilterSchema>;
