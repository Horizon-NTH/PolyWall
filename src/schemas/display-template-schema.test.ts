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

    it('sanitizes allowed zone style fields and strips unknown configuration keys', () => {
        const parsed = displayTemplateCreateSchema.safeParse({
            ...baseTemplate,
            configurationJson: {
                backgroundColor: '#000000',
                unknownTemplateKey: true,
            },
            zones: [{
                ...baseTemplate.zones[0],
                configurationJson: {
                    backgroundColor: '#ffffff33',
                    borderRadius: 24,
                    padding: 16,
                    borderWidth: 2,
                    borderColor: '#fff',
                    shadow: 'md',
                    opacity: 0.9,
                    unknownZoneKey: true,
                },
            }],
        });

        expect(parsed.success).toBe(true);
        expect(parsed.data?.configurationJson).toEqual({backgroundColor: '#000000'});
        expect(parsed.data?.zones[0]?.configurationJson).toEqual({
            displayMode: 'fullscreen',
            backgroundColor: '#ffffff33',
            borderRadius: 24,
            padding: 16,
            borderWidth: 2,
            borderColor: '#fff',
            shadow: 'md',
            opacity: 0.9,
        });
    });

    it('accepts carousel display mode on playlist zones', () => {
        const parsed = displayTemplateCreateSchema.safeParse({
            ...baseTemplate,
            zones: [{
                ...baseTemplate.zones[0],
                configurationJson: {
                    displayMode: 'carousel',
                    backgroundColor: 'transparent',
                    carouselMediaBorderRadius: 24,
                    carouselItemGap: 40,
                    carouselSideDimOpacity: 0.35,
                },
            }],
        });

        expect(parsed.success).toBe(true);
        expect(parsed.data?.zones[0]?.configurationJson).toEqual({
            displayMode: 'carousel',
            backgroundColor: 'transparent',
            carouselMediaBorderRadius: 24,
            carouselItemGap: 40,
            carouselSideDimOpacity: 0.35,
        });
    });

    it('rejects invalid playlist display modes', () => {
        const parsed = displayTemplateCreateSchema.safeParse({
            ...baseTemplate,
            zones: [{
                ...baseTemplate.zones[0],
                configurationJson: {
                    displayMode: 'ticker',
                },
            }],
        });

        expect(parsed.success).toBe(false);
        expect(parsed.error?.issues.some((issue) =>
            issue.path.join('.') === 'zones.0.configurationJson.displayMode',
        )).toBe(true);
    });

    it('rejects invalid carousel style values', () => {
        const parsed = displayTemplateCreateSchema.safeParse({
            ...baseTemplate,
            zones: [{
                ...baseTemplate.zones[0],
                configurationJson: {
                    displayMode: 'carousel',
                    carouselMediaBorderRadius: 999,
                    carouselItemGap: -1,
                    carouselSideDimOpacity: 1,
                },
            }],
        });

        expect(parsed.success).toBe(false);
        expect(parsed.error?.issues.some((issue) =>
            issue.path.join('.') === 'zones.0.configurationJson.carouselMediaBorderRadius',
        )).toBe(true);
        expect(parsed.error?.issues.some((issue) =>
            issue.path.join('.') === 'zones.0.configurationJson.carouselItemGap',
        )).toBe(true);
        expect(parsed.error?.issues.some((issue) =>
            issue.path.join('.') === 'zones.0.configurationJson.carouselSideDimOpacity',
        )).toBe(true);
    });

    it('rejects invalid style values', () => {
        const parsed = displayTemplateCreateSchema.safeParse({
            ...baseTemplate,
            zones: [{
                ...baseTemplate.zones[0],
                configurationJson: {
                    backgroundColor: 'url(javascript:alert(1))',
                    padding: 999,
                    opacity: 2,
                },
            }],
        });

        expect(parsed.success).toBe(false);
        expect(parsed.error?.issues.some((issue) =>
            issue.message === 'La couleur doit être une valeur hexadécimale ou transparent.',
        )).toBe(true);
        expect(parsed.error?.issues.some((issue) =>
            issue.message === 'La marge intérieure doit être comprise entre 0 et 256.',
        )).toBe(true);
        expect(parsed.error?.issues.some((issue) =>
            issue.message === 'L\'opacité doit être comprise entre 0 et 1.',
        )).toBe(true);
    });

    it('rejects invalid static image configuration', () => {
        const parsed = displayTemplateCreateSchema.safeParse({
            ...baseTemplate,
            zones: [
                baseTemplate.zones[0],
                {
                    name: 'Image statique',
                    zoneType: ZoneType.STATIC,
                    orderIndex: 1,
                    positionX: 0,
                    positionY: 0,
                    width: 400,
                    height: 300,
                    configurationJson: {
                        contentType: 'image',
                        fit: '',
                    },
                    widgetInstance: null,
                },
            ],
        });

        expect(parsed.success).toBe(false);
        expect(parsed.error?.issues.some((issue) => issue.message === 'Sélectionnez une image de la médiathèque.')).toBe(true);
        expect(parsed.error?.issues.some((issue) => issue.path.join('.') === 'zones.1.configurationJson.fit')).toBe(false);
    });

    it('accepts static image configuration with a media item id', () => {
        const parsed = displayTemplateCreateSchema.safeParse({
            ...baseTemplate,
            zones: [
                baseTemplate.zones[0],
                {
                    name: 'Logo',
                    zoneType: ZoneType.STATIC,
                    orderIndex: 1,
                    positionX: 0,
                    positionY: 0,
                    width: 320,
                    height: 180,
                    configurationJson: {
                        contentType: 'image',
                        mediaItemId: 'media-logo',
                        fit: 'contain',
                    },
                    widgetInstance: null,
                },
            ],
        });

        expect(parsed.success).toBe(true);
        expect(parsed.data?.zones[1]?.configurationJson).toEqual({
            contentType: 'image',
            mediaItemId: 'media-logo',
            fit: 'contain',
        });
    });
});
