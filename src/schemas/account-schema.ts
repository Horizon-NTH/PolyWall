import { z } from 'zod';

export const profileSchema = z.object({
    fullName: z
        .string()
        .trim()
        .min(2, 'Le nom complet doit contenir au moins 2 caractères')
        .max(120, 'Le nom complet doit contenir au maximum 120 caractères'),
});

export const changePasswordSchema = z
    .object({
        currentPassword: z
            .string()
            .min(8, 'Le mot de passe actuel doit contenir au moins 8 caractères')
            .max(128, 'Le mot de passe actuel doit contenir au maximum 128 caractères'),
        newPassword: z
            .string()
            .min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères')
            .max(128, 'Le nouveau mot de passe doit contenir au maximum 128 caractères'),
        confirmPassword: z
            .string()
            .min(8, 'La confirmation doit contenir au moins 8 caractères')
            .max(128, 'La confirmation doit contenir au maximum 128 caractères'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Les mots de passe ne correspondent pas.',
        path: ['confirmPassword'],
    });
