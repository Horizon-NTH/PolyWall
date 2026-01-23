import { z } from 'zod';

export const credentialsSchema = z.object({
    email: z
        .email()
        .trim()
        .toLowerCase()
        .min(1, 'L\'email est requis')
        .max(254, 'L\'email doit contenir au maximum 254 caractères'),
    password: z
        .string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
        .max(128, 'Le mot de passe doit contenir au maximum 128 caractères'),
});
