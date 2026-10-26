import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    loadStaticTransitFeed: vi.fn(),
    resolveTransitProvider: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/transit/gtfs-service', () => ({
    loadStaticTransitFeed: mocks.loadStaticTransitFeed,
    toTransitLine: (route: {
        id: string;
        shortName: string;
        longName: string;
        type: number;
        color: string;
        textColor: string;
    }) => ({
        routeId: route.id,
        shortName: route.shortName,
        longName: route.longName,
        type: route.type,
        color: `#${route.color || '64748b'}`,
        textColor: `#${route.textColor || 'ffffff'}`,
    }),
}));

vi.mock('@/lib/transit/transit-providers', () => ({
    resolveTransitProvider: mocks.resolveTransitProvider,
}));

function buildStaticFeed() {
    return {
        stops: new Map([
            ['stop-1', {id: 'stop-1', name: 'Université'}],
            ['stop-2', {id: 'stop-2', name: 'Gare'}],
        ]),
        routes: new Map([
            ['route-1', {
                id: 'route-1',
                shortName: 'T1',
                longName: 'Tram T1',
                type: 0,
                color: 'be185d',
                textColor: 'ffffff',
            }],
            ['route-2', {
                id: 'route-2',
                shortName: 'L5',
                longName: 'Bus L5',
                type: 3,
                color: '',
                textColor: '',
            }],
        ]),
        trips: new Map([
            ['trip-1', {id: 'trip-1', routeId: 'route-1', headsign: 'Gare centrale', serviceId: 'service-1'}],
            ['trip-2', {id: 'trip-2', routeId: 'route-1', headsign: 'Centre-ville', serviceId: 'service-1'}],
            ['trip-3', {id: 'trip-3', routeId: 'route-2', headsign: 'Campus universitaire', serviceId: 'service-1'}],
        ]),
        stopTimesByStopId: new Map([
            ['stop-1', [
                {tripId: 'trip-1', stopId: 'stop-1', arrivalSeconds: 3600, departureSeconds: 3600},
                {tripId: 'trip-2', stopId: 'stop-1', arrivalSeconds: 4200, departureSeconds: 4200},
                {tripId: 'trip-3', stopId: 'stop-1', arrivalSeconds: 4800, departureSeconds: 4800},
            ]],
            ['stop-2', [
                {tripId: 'trip-1', stopId: 'stop-2', arrivalSeconds: 5400, departureSeconds: 5400},
            ]],
        ]),
        calendars: [],
        calendarDates: new Map(),
    };
}

describe('transit index', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        mocks.resolveTransitProvider.mockResolvedValue({
            id: 'pan:test-network',
            label: 'Réseau test',
            staticGtfsUrl: 'https://example.test/gtfs.zip',
            tripUpdatesUrl: null,
        });
        mocks.loadStaticTransitFeed.mockResolvedValue(buildStaticFeed());
    });

    it('builds selectable stops, routes, destinations and display groups from GTFS data', async () => {
        const {getTransitProviderIndex} = await import('@/lib/transit/transit-index');

        const index = await getTransitProviderIndex({
            providerId: 'pan:test-network',
        });

        expect(index.provider).toEqual({
            id: 'pan:test-network',
            label: 'Réseau test',
        });
        expect(index.stops).toEqual([
            {
                id: 'stop-2',
                name: 'Gare',
                routeIds: ['route-1'],
                destinations: ['Gare centrale'],
            },
            {
                id: 'stop-1',
                name: 'Université',
                routeIds: ['route-1', 'route-2'],
                destinations: ['Campus universitaire', 'Centre-ville', 'Gare centrale'],
            },
        ]);
        expect(index.routes).toEqual([
            expect.objectContaining({routeId: 'route-2', shortName: 'L5', color: '#64748b'}),
            expect.objectContaining({routeId: 'route-1', shortName: 'T1', color: '#be185d'}),
        ]);
        expect(index.groups).toEqual(expect.arrayContaining([
            {stopId: 'stop-1', routeId: 'route-1', destination: 'Gare centrale'},
            {stopId: 'stop-1', routeId: 'route-1', destination: 'Centre-ville'},
            {stopId: 'stop-1', routeId: 'route-2', destination: 'Campus universitaire'},
            {stopId: 'stop-2', routeId: 'route-1', destination: 'Gare centrale'},
        ]));
    });
});
