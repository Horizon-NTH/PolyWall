import { z } from 'zod';

const userBaseSchema = z.object({
    fullName: z
        .string()
        .trim()
        .min(2, 'Le nom complet doit contenir au moins 2 caractères')
        .max(120, 'Le nom complet doit contenir au maximum 120 caractères'),
    email: z
        .string()
        .trim()
        .check(z.email())
        .toLowerCase()
        .min(1, 'L\'email est requis')
        .max(254, 'L\'email doit contenir au maximum 254 caractères'),
    description: z
        .string()
        .trim()
        .min(2, 'La description doit contenir au moins 2 caractères')
        .max(280, 'La description doit contenir au maximum 280 caractères'),
});

export const userCreateSchema = userBaseSchema.extend({
    password: z
        .string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
        .max(128, 'Le mot de passe doit contenir au maximum 128 caractères'),
    confirmPassword: z
        .string()
        .min(8, 'La confirmation doit contenir au moins 8 caractères')
        .max(128, 'La confirmation doit contenir au maximum 128 caractères'),
    active: z.boolean().default(true),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirmPassword'],
});

export const userUpdateSchema = userBaseSchema.extend({
    active: z.boolean(),
});
