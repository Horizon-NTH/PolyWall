import { z } from 'zod';

const screenBaseSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Le nom est requis.')
        .max(120, 'Le nom doit contenir au maximum 120 caractères.'),
    location: z
        .string()
        .trim()
        .min(1, 'La localisation est requise.')
        .max(255, 'La localisation doit contenir au maximum 255 caractères.'),
    channelId: z.string().trim().min(1, 'Le canal est requis.'),
    interactive: z.boolean().default(false),
    interactiveUrl: z
        .url('URL interactive invalide.')
        .max(2048, 'URL interactive trop longue.')
        .optional()
        .or(z.literal('')),
    inactivityTimeoutSeconds: z
        .number()
        .int('Le délai doit être un entier.')
        .positive('Le délai doit être supérieur à 0.')
        .max(24 * 3600, 'Le délai doit être inférieur à 24h.')
        .optional(),
});

const validateInteractiveFields = (
    values: {
        interactive?: boolean;
        interactiveUrl?: string;
        inactivityTimeoutSeconds?: number;
    },
    ctx: z.RefinementCtx,
) => {
    const hasUrl = typeof values.interactiveUrl === 'string' && values.interactiveUrl.trim().length > 0;
    if (!values.interactive && hasUrl) {
        ctx.addIssue({
            code: 'custom',
            message: 'URL interactive autorisée uniquement si l\'écran est interactif.',
            path: ['interactiveUrl'],
        });
    }
    const hasInactivityTimeout = typeof values.inactivityTimeoutSeconds === 'number';
    if (!values.interactive && hasInactivityTimeout) {
        ctx.addIssue({
            code: 'custom',
            message: 'Le délai d\'inactivité est autorisé uniquement si l\'écran est interactif.',
            path: ['inactivityTimeoutSeconds'],
        });
    }
};

export const screenApproveSchema = screenBaseSchema.superRefine((values, ctx) => {
    validateInteractiveFields(values, ctx);
});

export const screenUpdateSchema = screenBaseSchema
    .partial()
    .extend({
        name: screenBaseSchema.shape.name,
        location: screenBaseSchema.shape.location,
        channelId: screenBaseSchema.shape.channelId,
    })
    .superRefine((values, ctx) => {
        validateInteractiveFields(values, ctx);
    });

export const screenReactivateSchema = z.object({
    channelId: z.string().trim().min(1, 'Le canal est requis.'),
});

export const screenListFilterSchema = z.object({
    q: z.string().trim().default(''),
    status: z.enum(['all', 'PENDING', 'ACTIVE', 'REVOKED']).default('all'),
    interactive: z.enum(['all', 'interactive', 'non-interactive']).default('all'),
    sort: z
        .enum([
            'updatedAt-desc',
            'updatedAt-asc',
            'lastSeenAt-desc',
            'lastSeenAt-asc',
            'name-asc',
            'name-desc',
            'channel-asc',
            'channel-desc',
        ])
        .default('updatedAt-desc'),
});

export const screenPairingRequestSchema = z.object({
    otpCode: z.string().trim().regex(/^\d{6}$/, 'Code OTP invalide.'),
    deviceId: z.uuid('Identifiant appareil invalide.'),
    userAgent: z.string().trim().max(512).optional(),
    screenMeta: z.record(z.string(), z.unknown()).optional(),
});

export const screenStateQuerySchema = z.object({
    deviceId: z.uuid('Identifiant appareil invalide.'),
});

export type ScreenApproveValues = z.infer<typeof screenApproveSchema>;
export type ScreenUpdateValues = z.infer<typeof screenUpdateSchema>;
export type ScreenListFilterValues = z.infer<typeof screenListFilterSchema>;
