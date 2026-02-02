import { z } from 'zod';

export const organizationSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Le nom doit contenir au moins 2 caractères.')
        .max(120, 'Le nom ne peut pas dépasser 120 caractères.'),
    description: z
        .string()
        .trim()
        .min(2, 'La description doit contenir au moins 2 caractères.')
        .max(500, 'La description ne peut pas dépasser 500 caractères.'),
});
