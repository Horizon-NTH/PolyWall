import { z } from 'zod';

export const credentialsSchema = z.object({
    email: z.email().min(1, 'L\'email est requis'),
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});