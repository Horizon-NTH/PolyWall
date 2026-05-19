import { describe, expect, it } from 'vitest';

import { parseTransitWidgetConfig } from '@/lib/transit/transit-config';

describe('transit widget config', () => {
    it('uses empty generic defaults', () => {
        expect(parseTransitWidgetConfig({})).toEqual({
            providerId: '',
            stopIds: [],
            routeIds: [],
            destinations: [],
            maxDeparturesPerLine: 2,
            layoutDirection: 'row',
        });
    });

    it('accepts indexed stop, route and destination ids', () => {
        expect(parseTransitWidgetConfig({
            stopIds: ['stop-1'],
            routeIds: ['route-1'],
            destinations: ['Gare'],
        })).toMatchObject({
            stopIds: ['stop-1'],
            routeIds: ['route-1'],
            destinations: ['Gare'],
        });
    });

    it('bounds departures per line', () => {
        expect(parseTransitWidgetConfig({maxDeparturesPerLine: 0}).maxDeparturesPerLine).toBe(1);
        expect(parseTransitWidgetConfig({maxDeparturesPerLine: 20}).maxDeparturesPerLine).toBe(5);
    });

    it('supports horizontal and vertical layouts', () => {
        expect(parseTransitWidgetConfig({layoutDirection: 'column'}).layoutDirection).toBe('column');
        expect(parseTransitWidgetConfig({layoutDirection: 'invalid'}).layoutDirection).toBe('row');
    });
});
