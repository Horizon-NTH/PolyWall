import { z } from 'zod';

const channelBaseSchema = z.object({
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
    displayTemplateId: z.string().trim().min(1, 'Le modèle d\'affichage est requis.'),
});

export const channelCreateSchema = channelBaseSchema;
export const channelUpdateSchema = channelBaseSchema;

export const channelDeleteSchema = z
    .object({
        reassignToChannelId: z.string().trim().min(1).optional(),
    })
    .optional();

export const channelListFilterSchema = z.object({
    q: z.string().trim().default(''),
    screens: z.enum(['all', 'with-screens', 'without-screens']).default('all'),
    schedules: z.enum(['all', 'with-schedules', 'without-schedules']).default('all'),
    sort: z
        .enum([
            'updatedAt-desc',
            'updatedAt-asc',
            'createdAt-desc',
            'createdAt-asc',
            'name-asc',
            'name-desc',
            'screens-desc',
            'screens-asc',
            'schedules-desc',
            'schedules-asc',
        ])
        .default('updatedAt-desc'),
});

export type ChannelCreateValues = z.infer<typeof channelCreateSchema>;
export type ChannelUpdateValues = z.infer<typeof channelUpdateSchema>;
export type ChannelDeleteValues = z.infer<typeof channelDeleteSchema>;
export type ChannelListFilterValues = z.infer<typeof channelListFilterSchema>;
