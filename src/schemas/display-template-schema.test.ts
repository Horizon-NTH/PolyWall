import { describe, expect, it } from 'vitest';

import { ZoneType } from '@/generated/prisma/enums';
import { displayTemplateCreateSchema } from '@/schemas/display-template-schema';

const baseTemplate = {
    name: 'Hall',
    description: 'Template hall',
    resolutionX: 1920,
    resolutionY: 1080,
    configurationJson: {backgroundColor: '#000000'},
    zones: [{
        name: 'Main',
        zoneType: ZoneType.PLAYLIST,
        orderIndex: 0,
        positionX: 0,
        positionY: 0,
        width: 1920,
        height: 1080,
        configurationJson: {},
        widgetInstance: null,
    }],
};

describe('display-template-schema', () => {
    it('accepts a valid template with a playlist zone', () => {
        expect(displayTemplateCreateSchema.safeParse(baseTemplate).success).toBe(true);
    });

    it('rejects a template without playlist zone', () => {
        const parsed = displayTemplateCreateSchema.safeParse({
            ...baseTemplate,
            zones: [{
                ...baseTemplate.zones[0],
                zoneType: ZoneType.WIDGET,
            }],
        });

        expect(parsed.success).toBe(false);
        expect(parsed.error?.issues[0]?.message).toBe('Le modèle doit contenir exactement une zone playlist.');
    });

    it('rejects a template with multiple playlist zones', () => {
        const parsed = displayTemplateCreateSchema.safeParse({
            ...baseTemplate,
            zones: [
                baseTemplate.zones[0],
                {
                    ...baseTemplate.zones[0],
                    name: 'Second playlist',
                    orderIndex: 1,
                    positionX: 0,
                    positionY: 0,
                    width: 960,
                    height: 540,
                },
            ],
        });

        expect(parsed.success).toBe(false);
        expect(parsed.error?.issues[0]?.message).toBe('Le modèle doit contenir exactement une zone playlist.');
    });

    it('rejects zones outside the reference resolution', () => {
        const parsed = displayTemplateCreateSchema.safeParse({
            ...baseTemplate,
            zones: [{
                ...baseTemplate.zones[0],
                positionX: 1800,
                width: 300,
            }],
        });

        expect(parsed.success).toBe(false);
        expect(parsed.error?.issues[0]?.message).toBe('La zone doit rester dans la résolution du modèle.');
    });

    it('rejects a widget zone without a widget', () => {
        const parsed = displayTemplateCreateSchema.safeParse({
            ...baseTemplate,
            zones: [
                baseTemplate.zones[0],
                {
                    name: 'Horloge',
                    zoneType: ZoneType.WIDGET,
                    orderIndex: 1,
                    positionX: 0,
                    positionY: 0,
                    width: 400,
                    height: 300,
                    configurationJson: {},
                    widgetInstance: null,
                },
            ],
        });

        expect(parsed.success).toBe(false);
        expect(parsed.error?.issues.some((issue) =>
            issue.message === 'Une zone widget doit contenir un widget.',
        )).toBe(true);
    });

    it('rejects widgets on non-widget zones', () => {
        const parsed = displayTemplateCreateSchema.safeParse({
            ...baseTemplate,
            zones: [{
                ...baseTemplate.zones[0],
                widgetInstance: {
                    widgetTypeId: 'widget-type-clock',
                    active: true,
                    refreshPeriodSeconds: 30,
                    configurationJson: {timezone: 'Europe/Paris', format: 'HH:mm'},
                },
            }],
        });

        expect(parsed.success).toBe(false);
        expect(parsed.error?.issues.some((issue) =>
            issue.message === 'Seules les zones widget peuvent contenir un widget.',
        )).toBe(true);
    });
});
