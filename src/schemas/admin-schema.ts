import { z } from 'zod';
import { UserRole } from '@/generated/prisma/enums';

const adminRoles = [UserRole.PLATFORM_SUPER_ADMIN, UserRole.ORGANIZATION_ADMIN] as const;

export function isAdminRole(role: UserRole): role is typeof adminRoles[number] {
    return (adminRoles as readonly string[]).includes(role);
}

const adminBaseSchema = z.object({
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
    role: z.enum(UserRole),
    organizationId: z.string().trim().optional().nullable(),
});

type AdminBaseFields = z.infer<typeof adminBaseSchema>;

const withAdminRoleRules = <T extends z.ZodType<AdminBaseFields>>(schema: T) =>
    schema
        .refine((data) => isAdminRole(data.role), {
            message: 'Role admin invalide.',
            path: ['role'],
        })
        .superRefine((data, ctx) => {
            if (data.role === UserRole.ORGANIZATION_ADMIN && !data.organizationId) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['organizationId'],
                    message: 'Une organisation est requise pour un admin d\'organisation.',
                });
            }
        });

export const adminCreateSchema = withAdminRoleRules(
    adminBaseSchema.extend({
        password: z
            .string()
            .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
            .max(128, 'Le mot de passe doit contenir au maximum 128 caractères'),
        confirmPassword: z
            .string()
            .min(8, 'La confirmation doit contenir au moins 8 caractères')
            .max(128, 'La confirmation doit contenir au maximum 128 caractères'),
        active: z.boolean().default(true),
    }),
).refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirmPassword'],
});

export const adminUpdateSchema = withAdminRoleRules(
    adminBaseSchema.extend({
        active: z.boolean(),
    }),
);

export const adminToggleActiveSchema = z.object({
    adminId: z.string().min(1),
});

export const adminDeleteSchema = z.object({
    adminId: z.string().min(1),
});
