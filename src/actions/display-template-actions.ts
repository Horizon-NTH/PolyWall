'use server';

import { z } from 'zod';

import { auth } from '@/auth';
import { getFirstZodIssue } from '@/actions/action-utils';
import { createActionLogger } from '@/actions/action-logging';
import { Prisma } from '@/generated/prisma/client';
import { ZoneType } from '@/generated/prisma/enums';
import { defineAbilityFor } from '@/lib/casl/ability';
import { createDisplayTemplateKey } from '@/lib/display-templates/template-key';
import { prisma } from '@/lib/prisma';
import { areSupportedWidgetTypeIds } from '@/lib/widgets/widget-type-queries';
import {
    displayTemplateCreateSchema,
    displayTemplateDuplicateSchema,
    displayTemplateUpdateSchema,
} from '@/schemas/display-template-schema';

type DisplayTemplateField =
    | keyof z.infer<typeof displayTemplateCreateSchema>
    | 'templateId'
    | 'root';

type DisplayTemplateActionResult =
    | { ok: true; templateId?: string }
    | { ok: false; field?: DisplayTemplateField; message: string };

async function ensureDisplayTemplateAccess(requiredAction: 'read' | 'create' | 'update' | 'delete') {
    const session = await auth();
    if (!session?.user) {
        return {ok: false as const, message: 'Vous devez être connecté.'};
    }

    const ability = defineAbilityFor(session.user);
    if (!ability.can(requiredAction, 'DisplayTemplate')) {
        return {ok: false as const, message: 'Accès refusé.'};
    }

    if (!session.user.organizationId) {
        return {ok: false as const, message: 'Aucune organisation sélectionnée.'};
    }

    return {
        ok: true as const,
        session,
        organizationId: session.user.organizationId,
    };
}

function isUniqueConstraintError(error: unknown) {
    return (error as { code?: string }).code === 'P2002';
}

async function findTemplateForMutation(templateId: string, organizationId: string) {
    return prisma.displayTemplate.findFirst({
        where: {
            id: templateId,
            organizationId,
        },
        select: {
            id: true,
            organizationId: true,
            _count: {
                select: {
                    channels: true,
                },
            },
        },
    });
}

function toJsonInput(value: Record<string, unknown>): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
}

function buildZoneCreateData(
    zone: z.infer<typeof displayTemplateCreateSchema>['zones'][number],
    organizationId: string,
) {
    return {
        name: zone.name,
        zoneType: zone.zoneType,
        orderIndex: zone.orderIndex,
        positionX: zone.positionX,
        positionY: zone.positionY,
        width: zone.width,
        height: zone.height,
        configurationJson: toJsonInput(zone.configurationJson),
        widgetInstance: zone.widgetInstance
            ? {
                create: {
                    active: true,
                    refreshPeriodSeconds: zone.widgetInstance.refreshPeriodSeconds,
                    configurationJson: toJsonInput(zone.widgetInstance.configurationJson),
                    organizationId,
                    widgetTypeId: zone.widgetInstance.widgetTypeId,
                },
            }
            : undefined,
    };
}

export async function createDisplayTemplate(
    data: z.infer<typeof displayTemplateCreateSchema>,
): Promise<DisplayTemplateActionResult> {
    const log = createActionLogger({event: 'display-template.create', action: 'create'});
    const access = await ensureDisplayTemplateAccess('create');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const parsed = displayTemplateCreateSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({field: issue.field, actorUserId: access.session.user.id, organizationId: access.organizationId});
        return {ok: false, field: issue.field as DisplayTemplateField, message: issue.message};
    }

    const widgetTypesValid = await areSupportedWidgetTypeIds(
        parsed.data.zones.flatMap((zone) => zone.widgetInstance ? [zone.widgetInstance.widgetTypeId] : []),
    );
    if (!widgetTypesValid) {
        log.invalid({field: 'zones', actorUserId: access.session.user.id, organizationId: access.organizationId});
        return {ok: false, field: 'zones', message: 'Un type de widget est introuvable.'};
    }

    try {
        const created = await prisma.displayTemplate.create({
            data: {
                name: parsed.data.name,
                description: parsed.data.description,
                templateKey: createDisplayTemplateKey(access.organizationId, parsed.data.name),
                resolutionX: parsed.data.resolutionX,
                resolutionY: parsed.data.resolutionY,
                configurationJson: toJsonInput(parsed.data.configurationJson),
                organizationId: access.organizationId,
                zones: {
                    create: parsed.data.zones.map((zone) => buildZoneCreateData(zone, access.organizationId)),
                },
            },
            select: {id: true},
        });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: created.id,
        });
        return {ok: true, templateId: created.id};
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return {ok: false, field: 'name', message: 'Un modèle avec ce nom existe déjà.'};
        }

        log.error(error, {actorUserId: access.session.user.id, organizationId: access.organizationId});
        return {ok: false, field: 'root', message: 'Impossible de créer ce modèle.'};
    }
}

export async function updateDisplayTemplate(
    templateId: string,
    data: z.infer<typeof displayTemplateUpdateSchema>,
): Promise<DisplayTemplateActionResult> {
    const log = createActionLogger({event: 'display-template.update', action: 'update', targetId: templateId});
    const access = await ensureDisplayTemplateAccess('update');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const template = templateId ? await findTemplateForMutation(templateId, access.organizationId) : null;
    if (!template) {
        log.invalid({actorUserId: access.session.user.id, organizationId: access.organizationId, targetId: templateId});
        return {ok: false, field: 'templateId', message: 'Modèle d’affichage introuvable.'};
    }

    const parsed = displayTemplateUpdateSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({
            field: issue.field,
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: template.id,
        });
        return {ok: false, field: issue.field as DisplayTemplateField, message: issue.message};
    }

    const widgetTypesValid = await areSupportedWidgetTypeIds(
        parsed.data.zones.flatMap((zone) => zone.widgetInstance ? [zone.widgetInstance.widgetTypeId] : []),
    );
    if (!widgetTypesValid) {
        return {ok: false, field: 'zones', message: 'Un type de widget est introuvable.'};
    }

    try {
        const updated = await prisma.$transaction(async (tx) => {
            await tx.displayZone.deleteMany({
                where: {templateId: template.id},
            });

            return tx.displayTemplate.update({
                where: {id: template.id},
                data: {
                    name: parsed.data.name,
                    description: parsed.data.description,
                    templateKey: createDisplayTemplateKey(access.organizationId, parsed.data.name),
                    resolutionX: parsed.data.resolutionX,
                    resolutionY: parsed.data.resolutionY,
                    configurationJson: toJsonInput(parsed.data.configurationJson),
                    zones: {
                        create: parsed.data.zones.map((zone) => buildZoneCreateData(zone, access.organizationId)),
                    },
                },
                select: {id: true},
            });
        });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: updated.id,
        });
        return {ok: true, templateId: updated.id};
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return {ok: false, field: 'name', message: 'Un modèle avec ce nom existe déjà.'};
        }

        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: template.id,
        });
        return {ok: false, field: 'root', message: 'Impossible de mettre à jour ce modèle.'};
    }
}

export async function duplicateDisplayTemplate(
    templateId: string,
    data: z.infer<typeof displayTemplateDuplicateSchema>,
): Promise<DisplayTemplateActionResult> {
    const log = createActionLogger({event: 'display-template.duplicate', action: 'create', targetId: templateId});
    const access = await ensureDisplayTemplateAccess('create');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const parsed = displayTemplateDuplicateSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        return {ok: false, field: issue.field as DisplayTemplateField, message: issue.message};
    }

    const source = await prisma.displayTemplate.findFirst({
        where: {
            id: templateId,
            OR: [{organizationId: null}, {organizationId: access.organizationId}],
        },
        select: {
            description: true,
            resolutionX: true,
            resolutionY: true,
            configurationJson: true,
            zones: {
                orderBy: {orderIndex: 'asc'},
                select: {
                    name: true,
                    zoneType: true,
                    orderIndex: true,
                    positionX: true,
                    positionY: true,
                    width: true,
                    height: true,
                    configurationJson: true,
                    widgetInstance: {
                        select: {
                            active: true,
                            refreshPeriodSeconds: true,
                            configurationJson: true,
                            widgetTypeId: true,
                            widgetType: {
                                select: {
                                    technicalKey: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!source) {
        return {ok: false, field: 'templateId', message: 'Modèle d’affichage introuvable.'};
    }

    try {
        const created = await prisma.displayTemplate.create({
            data: {
                name: parsed.data.name,
                description: source.description,
                templateKey: createDisplayTemplateKey(access.organizationId, parsed.data.name),
                resolutionX: source.resolutionX,
                resolutionY: source.resolutionY,
                configurationJson: source.configurationJson ?? Prisma.JsonNull,
                organizationId: access.organizationId,
                zones: {
                    create: source.zones.map((zone) => ({
                        name: zone.name,
                        zoneType: zone.zoneType,
                        orderIndex: zone.orderIndex,
                        positionX: zone.positionX,
                        positionY: zone.positionY,
                        width: zone.width,
                        height: zone.height,
                        configurationJson: zone.configurationJson ?? Prisma.JsonNull,
                        widgetInstance: zone.zoneType === ZoneType.WIDGET
                            ? {
                                create: {
                                    active: true,
                                    refreshPeriodSeconds: zone.widgetInstance!.refreshPeriodSeconds,
                                    configurationJson: zone.widgetInstance!.configurationJson ?? Prisma.JsonNull,
                                    organizationId: access.organizationId,
                                    widgetTypeId: zone.widgetInstance!.widgetTypeId,
                                },
                            }
                            : undefined,
                    })),
                },
            },
            select: {id: true},
        });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: created.id,
        });
        return {ok: true, templateId: created.id};
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return {ok: false, field: 'name', message: 'Un modèle avec ce nom existe déjà.'};
        }

        log.error(error, {actorUserId: access.session.user.id, organizationId: access.organizationId});
        return {ok: false, field: 'root', message: 'Impossible de dupliquer ce modèle.'};
    }
}

export async function deleteDisplayTemplate(templateId: string): Promise<DisplayTemplateActionResult> {
    const log = createActionLogger({event: 'display-template.delete', action: 'delete', targetId: templateId});
    const access = await ensureDisplayTemplateAccess('delete');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const template = templateId ? await findTemplateForMutation(templateId, access.organizationId) : null;
    if (!template) {
        log.invalid({actorUserId: access.session.user.id, organizationId: access.organizationId, targetId: templateId});
        return {
            ok: false, field: 'templateId', message: 'Modèle d\'affichage introuvable.',
        };
    }

    if (template._count.channels > 0) {
        return {
            ok: false,
            field: 'root',
            message: 'Impossible de supprimer un modèle utilisé par un canal.',
        };
    }

    try {
        const deleted = await prisma.displayTemplate.delete({
            where: {id: template.id},
            select: {id: true},
        });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: deleted.id,
        });
        return {ok: true, templateId: deleted.id};
    } catch (error) {
        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: template.id,
        });
        return {ok: false, field: 'root', message: 'Impossible de supprimer ce modèle.'};
    }
}
