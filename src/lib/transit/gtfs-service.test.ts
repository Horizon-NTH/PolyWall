import { zipSync, strToU8 } from 'fflate';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    resolveTransitProvider: vi.fn(() => ({
        id: 'test',
        label: 'Test Transit',
        staticGtfsUrl: 'https://example.test/static.zip',
        tripUpdatesUrl: 'https://example.test/realtime.pb',
    })),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/transit/transit-providers', () => ({
    resolveTransitProvider: mocks.resolveTransitProvider,
}));

function createGtfsZip() {
    return zipSync({
        'stops.txt': strToU8([
            'stop_id,stop_name',
            'stop-1,Université',
        ].join('\n')),
        'routes.txt': strToU8([
            'route_id,route_short_name,route_long_name,route_type,route_color,route_text_color',
            'route-1,T1,Tram T1,0,be185d,ffffff',
        ].join('\n')),
        'trips.txt': strToU8([
            'route_id,service_id,trip_id,trip_headsign,direction_id',
            'route-1,service-1,trip-1,DIJON Gare,0',
            'route-1,service-1,trip-2,QUETIGNY Centre,1',
        ].join('\n')),
        'stop_times.txt': strToU8([
            'trip_id,arrival_time,departure_time,stop_id,stop_sequence',
            'trip-1,10:20:00,10:20:00,stop-1,1',
            'trip-2,10:30:00,10:30:00,stop-1,1',
        ].join('\n')),
        'calendar.txt': strToU8([
            'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date',
            'service-1,1,1,1,1,1,1,1,20260101,20261231',
        ].join('\n')),
        'calendar_dates.txt': strToU8('service_id,date,exception_type\n'),
    });
}

function createRealtimeFeed() {
    return GtfsRealtimeBindings.transit_realtime.FeedMessage.encode({
        header: {
            gtfsRealtimeVersion: '2.0',
            timestamp: 1,
        },
        entity: [{
            id: 'entity-1',
            tripUpdate: {
                trip: {
                    tripId: 'trip-1',
                    routeId: 'route-1',
                },
                stopTimeUpdate: [{
                    stopId: 'stop-1',
                    departure: {
                        time: Math.floor(new Date('2026-05-16T10:19:00.000Z').getTime() / 1000),
                        delay: 60,
                    },
                }],
            },
        }],
    }).finish();
}

function createRealtimeFeedWithoutTripId() {
    return GtfsRealtimeBindings.transit_realtime.FeedMessage.encode({
        header: {
            gtfsRealtimeVersion: '2.0',
            timestamp: 1,
        },
        entity: [{
            id: 'entity-1',
            tripUpdate: {
                trip: {
                    routeId: 'route-1',
                    directionId: 1,
                },
                stopTimeUpdate: [{
                    stopId: 'stop-1',
                    departure: {
                        time: Math.floor(new Date('2026-05-16T10:25:00.000Z').getTime() / 1000),
                    },
                }],
            },
        }],
    }).finish();
}

function toArrayBuffer(value: Uint8Array) {
    return new Uint8Array(value).buffer;
}

describe('gtfs transit service', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.endsWith('/static.zip')) {
                return new Response(toArrayBuffer(createGtfsZip()));
            }

            return new Response(toArrayBuffer(createRealtimeFeed()));
        }));
    });

    it('normalizes GTFS-RT departures using static GTFS metadata', async () => {
        const {getTransitDepartures} = await import('@/lib/transit/gtfs-service');
        const result = await getTransitDepartures({
            providerId: 'test',
            stopIds: ['stop-1'],
            routeIds: [],
            destinations: [],
            maxDeparturesPerLine: 2,
            layoutDirection: 'row',
        }, new Date('2026-05-16T10:15:00.000Z'));

        expect(result).toEqual({
            departures: [{
                stopId: 'stop-1',
                stopName: 'Université',
                line: {
                    routeId: 'route-1',
                    shortName: 'T1',
                    longName: 'Tram T1',
                    type: 0,
                    color: '#be185d',
                    textColor: '#ffffff',
                },
                destination: 'DIJON Gare',
                departureTime: '2026-05-16T10:19:00.000Z',
                realtime: true,
            }],
        });
    });

    it('uses the static GTFS headsign instead of showing a GTFS-RT direction id', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.endsWith('/static.zip')) {
                return new Response(toArrayBuffer(createGtfsZip()));
            }

            return new Response(toArrayBuffer(createRealtimeFeedWithoutTripId()));
        }));

        const {getTransitDepartures} = await import('@/lib/transit/gtfs-service');
        const result = await getTransitDepartures({
            providerId: 'test',
            stopIds: ['stop-1'],
            routeIds: [],
            destinations: [],
            maxDeparturesPerLine: 2,
            layoutDirection: 'row',
        }, new Date('2026-05-16T10:15:00.000Z'));

        expect(result.departures[0]?.destination).toBe('QUETIGNY Centre');
    });
});
