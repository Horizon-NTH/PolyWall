import { z } from 'zod';

import { ZoneType } from '@/generated/prisma/enums';
import { ZONE_SHADOW_OPTIONS } from '@/lib/display-runtime/template-style';

const jsonObjectSchema = z.record(z.string(), z.unknown());
const cssColorSchema = z
    .string()
    .trim()
    .min(1, 'La couleur est requise.')
    .max(80, 'La couleur est trop longue.')
    .regex(
        /^(transparent|#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))$/,
        'La couleur doit être une valeur hexadécimale ou transparent.',
    );
const boundedNumber = (min: number, max: number, message: string) => z
    .coerce
    .number({error: message})
    .min(min, message)
    .max(max, message);
const optionalStaticImageFitSchema = z.preprocess(
    (value) => value === '' ? undefined : value,
    z.enum(['contain', 'cover']).optional(),
);

function stripUndefinedValues(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined));
}

const templateConfigurationSchema = z
    .object({
        backgroundColor: cssColorSchema.optional(),
    })
    .strip()
    .transform((value) => stripUndefinedValues(value))
    .default({});

const zoneStyleSchema = z
    .object({
        backgroundColor: cssColorSchema.optional(),
        borderColor: cssColorSchema.optional(),
        borderRadius: boundedNumber(0, 256, 'Les coins arrondis doivent être compris entre 0 et 256.').optional(),
        padding: boundedNumber(0, 256, 'La marge intérieure doit être comprise entre 0 et 256.').optional(),
        borderWidth: boundedNumber(0, 32, 'La bordure doit être comprise entre 0 et 32.').optional(),
        shadow: z.enum(ZONE_SHADOW_OPTIONS).optional(),
        opacity: boundedNumber(0, 1, 'L\'opacité doit être comprise entre 0 et 1.').optional(),
    })
    .strip();

const staticZoneConfigurationSchema = zoneStyleSchema
    .extend({
        contentType: z.enum(['text', 'image']).optional(),
        text: z.string().max(2000, 'Le texte statique doit contenir au maximum 2000 caractères.').optional(),
        color: cssColorSchema.optional(),
        mediaItemId: z.string().trim().optional(),
        fit: optionalStaticImageFitSchema,
    })
    .strip()
    .superRefine((configuration, context) => {
        if (configuration.contentType !== 'image') return;

        if (!configuration.mediaItemId) {
            context.addIssue({
                code: 'custom',
                path: ['mediaItemId'],
                message: 'Sélectionnez une image de la médiathèque.',
            });
        }
    });

function getZoneConfigurationSchema(zoneType: ZoneType) {
    return zoneType === ZoneType.STATIC ? staticZoneConfigurationSchema : zoneStyleSchema;
}

function sanitizeZoneConfiguration(zoneType: ZoneType, configurationJson: Record<string, unknown>) {
    return stripUndefinedValues(getZoneConfigurationSchema(zoneType).parse(configurationJson));
}

const displayTemplateBaseSchema = z.object({
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
    resolutionX: z
        .number({error: 'La largeur de référence est requise.'})
        .int('La largeur doit être un entier.')
        .min(320, 'La largeur doit être supérieure ou égale à 320.')
        .max(7680, 'La largeur doit être inférieure ou égale à 7680.'),
    resolutionY: z
        .number({error: 'La hauteur de référence est requise.'})
        .int('La hauteur doit être un entier.')
        .min(240, 'La hauteur doit être supérieure ou égale à 240.')
        .max(4320, 'La hauteur doit être inférieure ou égale à 4320.'),
    configurationJson: templateConfigurationSchema,
});

export const widgetInstanceSchema = z.object({
    id: z.string().trim().optional(),
    widgetTypeId: z.string().trim().min(1, 'Le type de widget est requis.'),
    active: z.boolean().default(true),
    refreshPeriodSeconds: z
        .number()
        .int('La période de rafraîchissement doit être un entier.')
        .min(5, 'La période de rafraîchissement minimale est de 5 secondes.')
        .max(86400, 'La période de rafraîchissement maximale est de 24 heures.'),
    configurationJson: jsonObjectSchema.default({}),
});

export const displayZoneSchema = z
    .object({
        id: z.string().trim().optional(),
        name: z
            .string()
            .trim()
            .min(1, 'Le nom de la zone est requis.')
            .max(120, 'Le nom de la zone doit contenir au maximum 120 caractères.'),
        zoneType: z.enum(ZoneType),
        orderIndex: z.number().int().min(0),
        positionX: z.number().int().min(0),
        positionY: z.number().int().min(0),
        width: z.number().int().min(1),
        height: z.number().int().min(1),
        configurationJson: jsonObjectSchema.default({}),
        widgetInstance: widgetInstanceSchema.nullable().default(null),
    })
    .superRefine((zone, context) => {
        const parsedConfiguration = getZoneConfigurationSchema(zone.zoneType).safeParse(zone.configurationJson);
        if (!parsedConfiguration.success) {
            parsedConfiguration.error.issues.forEach((issue) => {
                context.addIssue({
                    code: 'custom',
                    path: ['configurationJson', ...issue.path],
                    message: issue.message,
                });
            });
        }
    })
    .transform((zone) => ({
        ...zone,
        configurationJson: sanitizeZoneConfiguration(zone.zoneType, zone.configurationJson),
    }));

function validateTemplateGeometry(
    value: z.infer<typeof displayTemplateBaseSchema> & { zones: z.infer<typeof displayZoneSchema>[] },
    context: z.RefinementCtx,
) {
    const playlistZonesCount = value.zones.filter((zone) => zone.zoneType === ZoneType.PLAYLIST).length;
    if (playlistZonesCount !== 1) {
        context.addIssue({
            code: 'custom',
            path: ['zones'],
            message: 'Le modèle doit contenir exactement une zone playlist.',
        });
    }

    const zoneOrders = new Set<number>();

    value.zones.forEach((zone, zoneIndex) => {
        if (zoneOrders.has(zone.orderIndex)) {
            context.addIssue({
                code: 'custom',
                path: ['zones', zoneIndex, 'orderIndex'],
                message: 'Cet ordre de zone est déjà utilisé.',
            });
        }
        zoneOrders.add(zone.orderIndex);

        if (zone.positionX + zone.width > value.resolutionX || zone.positionY + zone.height > value.resolutionY) {
            context.addIssue({
                code: 'custom',
                path: ['zones', zoneIndex, 'width'],
                message: 'La zone doit rester dans la résolution du modèle.',
            });
        }

        if (zone.zoneType === ZoneType.WIDGET && !zone.widgetInstance) {
            context.addIssue({
                code: 'custom',
                path: ['zones', zoneIndex, 'widgetInstance'],
                message: 'Une zone widget doit contenir un widget.',
            });
        }

        if (zone.zoneType !== ZoneType.WIDGET && zone.widgetInstance) {
            context.addIssue({
                code: 'custom',
                path: ['zones', zoneIndex, 'widgetInstance'],
                message: 'Seules les zones widget peuvent contenir un widget.',
            });
        }
    });
}

export const displayTemplateCreateSchema = displayTemplateBaseSchema
    .extend({
        scope: z.enum(['organization', 'global']).default('organization'),
        zones: z.array(displayZoneSchema).min(1, 'Ajoutez au moins une zone.'),
    })
    .superRefine(validateTemplateGeometry);

export const displayTemplateUpdateSchema = displayTemplateBaseSchema
    .extend({
        zones: z.array(displayZoneSchema).min(1, 'Ajoutez au moins une zone.'),
    })
    .superRefine(validateTemplateGeometry);

export const displayTemplateDuplicateSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Le nom est requis.')
        .max(120, 'Le nom doit contenir au maximum 120 caractères.'),
});

export const displayTemplateListFilterSchema = z.object({
    q: z.string().trim().default(''),
    scope: z.enum(['all', 'organization', 'global']).default('all'),
    sort: z
        .enum([
            'updatedAt-desc',
            'updatedAt-asc',
            'name-asc',
            'name-desc',
            'channels-desc',
            'channels-asc',
        ])
        .default('updatedAt-desc'),
});

export type DisplayTemplateCreateValues = z.infer<typeof displayTemplateCreateSchema>;
export type DisplayTemplateUpdateValues = z.infer<typeof displayTemplateUpdateSchema>;
export type DisplayTemplateDuplicateValues = z.infer<typeof displayTemplateDuplicateSchema>;
export type DisplayTemplateListFilterValues = z.infer<typeof displayTemplateListFilterSchema>;
