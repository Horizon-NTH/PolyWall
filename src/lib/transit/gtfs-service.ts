import 'server-only';

import { parse } from 'csv-parse/sync';
import { unzipSync, strFromU8 } from 'fflate';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

import { resolveTransitProvider } from '@/lib/transit/transit-providers';
import { type TransitDeparture, TransitLine, type TransitWidgetConfig } from '@/lib/transit/transit-types';

export type GtfsStop = {
    id: string;
    name: string;
};

export type GtfsRoute = {
    id: string;
    shortName: string;
    longName: string;
    type: number;
    color: string;
    textColor: string;
};

export type GtfsTrip = {
    id: string;
    routeId: string;
    headsign: string;
    serviceId: string;
    directionId: string;
};

export type GtfsStopTime = {
    tripId: string;
    stopId: string;
    arrivalSeconds: number;
    departureSeconds: number;
};

export type GtfsCalendar = {
    serviceId: string;
    weekdays: boolean[];
    startDate: string;
    endDate: string;
};

export type GtfsStaticFeed = {
    stops: Map<string, GtfsStop>;
    routes: Map<string, GtfsRoute>;
    trips: Map<string, GtfsTrip>;
    stopTimesByStopId: Map<string, GtfsStopTime[]>;
    calendars: GtfsCalendar[];
    calendarDates: Map<string, Map<string, 1 | 2>>;
};

type CachedStaticFeed = {
    expiresAt: number;
    feed: GtfsStaticFeed;
};

type CachedRealtimeFeed = {
    expiresAt: number;
    feed: GtfsRealtimeBindings.transit_realtime.FeedMessage;
};

const STATIC_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REALTIME_CACHE_TTL_MS = 25 * 1000;
const DEPARTURE_HORIZON_SECONDS = 6 * 60 * 60;
const TRANSIT_FETCH_TIMEOUT_MS = 10_000;
const MAX_GTFS_ZIP_BYTES = 25 * 1024 * 1024;
const MAX_GTFS_UNZIPPED_BYTES = 150 * 1024 * 1024;
const MAX_REALTIME_FEED_BYTES = 5 * 1024 * 1024;
const staticFeedCache = new Map<string, CachedStaticFeed>();
const realtimeFeedCache = new Map<string, CachedRealtimeFeed>();

export function toTransitLine(route: GtfsRoute): TransitLine {
    return {
        routeId: route.id,
        shortName: route.shortName,
        longName: route.longName,
        type: route.type,
        color: `#${route.color || '64748b'}`,
        textColor: `#${route.textColor || 'ffffff'}`,
    };
}

function parseCsv(text: string) {
    return parse(text, {
        bom: true,
        columns: true,
        skip_empty_lines: true,
    }) as Array<Record<string, string>>;
}

function parseGtfsTime(value: string) {
    const [hours, minutes, seconds] = value.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
    return (hours * 3600) + (minutes * 60) + seconds;
}

function gtfsDate(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function secondsSinceLocalMidnight(value: Date) {
    return (value.getHours() * 3600) + (value.getMinutes() * 60) + value.getSeconds();
}

function getZipText(files: Record<string, Uint8Array>, fileName: string) {
    const file = files[fileName];
    return file ? strFromU8(file) : '';
}

async function fetchArrayBuffer(url: string, maxBytes: number) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), TRANSIT_FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(url, {cache: 'no-store', signal: abortController.signal});
        if (!response.ok) {
            throw new Error(`Transit feed request failed with status ${response.status}`);
        }

        const contentLength = Number(response.headers.get('content-length') ?? 0);
        if (contentLength > maxBytes) {
            throw new Error(`Transit feed is too large (${contentLength} bytes)`);
        }

        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > maxBytes) {
            throw new Error(`Transit feed is too large (${buffer.byteLength} bytes)`);
        }

        return buffer;
    } finally {
        clearTimeout(timeout);
    }
}

function getTotalUnzippedBytes(files: Record<string, Uint8Array>) {
    return Object.values(files).reduce((total, file) => total + file.byteLength, 0);
}

export async function loadStaticTransitFeed(provider: Awaited<ReturnType<typeof resolveTransitProvider>>) {
    const cached = staticFeedCache.get(provider.id);
    if (cached && cached.expiresAt > Date.now()) return cached.feed;

    const files = unzipSync(new Uint8Array(await fetchArrayBuffer(provider.staticGtfsUrl, MAX_GTFS_ZIP_BYTES)));
    const totalUnzippedBytes = getTotalUnzippedBytes(files);
    if (totalUnzippedBytes > MAX_GTFS_UNZIPPED_BYTES) {
        throw new Error(`GTFS archive is too large after unzip (${totalUnzippedBytes} bytes)`);
    }

    const stops = new Map<string, GtfsStop>();
    const routes = new Map<string, GtfsRoute>();
    const trips = new Map<string, GtfsTrip>();
    const stopTimesByStopId = new Map<string, GtfsStopTime[]>();
    const calendarDates = new Map<string, Map<string, 1 | 2>>();

    for (const row of parseCsv(getZipText(files, 'stops.txt'))) {
        const stopId = row.stop_id;
        if (!stopId) continue;
        stops.set(stopId, {id: stopId, name: row.stop_name || stopId});
    }

    for (const row of parseCsv(getZipText(files, 'routes.txt'))) {
        const routeId = row.route_id;
        if (!routeId) continue;
        routes.set(routeId, {
            id: routeId,
            shortName: row.route_short_name || row.route_long_name || routeId,
            longName: row.route_long_name || '',
            type: Number(row.route_type) || 0,
            color: row.route_color || '64748b',
            textColor: row.route_text_color || 'ffffff',
        });
    }

    for (const row of parseCsv(getZipText(files, 'trips.txt'))) {
        const tripId = row.trip_id;
        const routeId = row.route_id;
        if (!tripId || !routeId) continue;
        trips.set(tripId, {
            id: tripId,
            routeId,
            headsign: row.trip_headsign || '',
            serviceId: row.service_id || '',
            directionId: row.direction_id || '',
        });
    }

    for (const row of parseCsv(getZipText(files, 'stop_times.txt'))) {
        const tripId = row.trip_id;
        const stopId = row.stop_id;
        const departureSeconds = parseGtfsTime(row.departure_time || row.arrival_time);
        const arrivalSeconds = parseGtfsTime(row.arrival_time || row.departure_time);
        if (!tripId || !stopId || departureSeconds === null || arrivalSeconds === null) continue;

        const stopTimes = stopTimesByStopId.get(stopId) ?? [];
        stopTimes.push({tripId, stopId, arrivalSeconds, departureSeconds});
        stopTimesByStopId.set(stopId, stopTimes);
    }

    for (const stopTimes of stopTimesByStopId.values()) {
        stopTimes.sort((a, b) => a.departureSeconds - b.departureSeconds);
    }

    const calendars = parseCsv(getZipText(files, 'calendar.txt')).map((row): GtfsCalendar => ({
        serviceId: row.service_id || '',
        weekdays: [
            row.sunday === '1',
            row.monday === '1',
            row.tuesday === '1',
            row.wednesday === '1',
            row.thursday === '1',
            row.friday === '1',
            row.saturday === '1',
        ],
        startDate: row.start_date || '',
        endDate: row.end_date || '',
    })).filter((calendar) => calendar.serviceId);

    for (const row of parseCsv(getZipText(files, 'calendar_dates.txt'))) {
        const serviceId = row.service_id;
        const date = row.date;
        const exceptionType = row.exception_type === '2' ? 2 : 1;
        if (!serviceId || !date) continue;

        const exceptions = calendarDates.get(date) ?? new Map<string, 1 | 2>();
        exceptions.set(serviceId, exceptionType);
        calendarDates.set(date, exceptions);
    }

    const feed = {stops, routes, trips, stopTimesByStopId, calendars, calendarDates};
    staticFeedCache.set(provider.id, {feed, expiresAt: Date.now() + STATIC_CACHE_TTL_MS});
    return feed;
}

async function loadRealtimeFeed(provider: Awaited<ReturnType<typeof resolveTransitProvider>>) {
    const cached = realtimeFeedCache.get(provider.id);
    if (cached && cached.expiresAt > Date.now()) return cached.feed;

    if (!provider.tripUpdatesUrl) {
        throw new Error(`No GTFS-RT trip updates resource found for provider ${provider.id}`);
    }

    const buffer = await fetchArrayBuffer(provider.tripUpdatesUrl, MAX_REALTIME_FEED_BYTES);
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
    realtimeFeedCache.set(provider.id, {feed, expiresAt: Date.now() + REALTIME_CACHE_TTL_MS});
    return feed;
}

function findMatchingStops(feed: GtfsStaticFeed, config: TransitWidgetConfig) {
    return config.stopIds.filter((stopId) => feed.stops.has(stopId));
}

function routeMatches(route: GtfsRoute, config: TransitWidgetConfig) {
    return config.routeIds.length === 0 || config.routeIds.includes(route.id);
}

function destinationMatches(destination: string, config: TransitWidgetConfig) {
    return config.destinations.length === 0 || config.destinations.includes(destination);
}

function isServiceActive(feed: GtfsStaticFeed, serviceId: string, now: Date) {
    const date = gtfsDate(now);
    const exception = feed.calendarDates.get(date)?.get(serviceId);
    if (exception === 1) return true;
    if (exception === 2) return false;

    return feed.calendars.some((calendar) =>
        calendar.serviceId === serviceId &&
        calendar.weekdays[now.getDay()] &&
        calendar.startDate <= date &&
        calendar.endDate >= date,
    );
}

function getStaticHeadsignForRealtimeTrip(params: {
    staticFeed: GtfsStaticFeed;
    routeId: string;
    stopId: string;
    directionId: string;
    config: TransitWidgetConfig;
}) {
    if (!params.directionId) return '';

    const headsigns = new Set<string>();
    for (const stopTime of params.staticFeed.stopTimesByStopId.get(params.stopId) ?? []) {
        const trip = params.staticFeed.trips.get(stopTime.tripId);
        if (!trip || trip.routeId !== params.routeId || trip.directionId !== params.directionId || !trip.headsign) {
            continue;
        }

        if (destinationMatches(trip.headsign, params.config)) {
            headsigns.add(trip.headsign);
        }
    }

    return headsigns.size === 1 ? [...headsigns][0] : '';
}

function getRealtimeDestination(params: {
    staticFeed: GtfsStaticFeed;
    trip: GtfsTrip | null;
    tripDescriptor: GtfsRealtimeBindings.transit_realtime.ITripDescriptor | null | undefined;
    route: GtfsRoute;
    stopId: string;
    config: TransitWidgetConfig;
}) {
    if (params.trip?.headsign) return params.trip.headsign;

    const staticHeadsign = getStaticHeadsignForRealtimeTrip({
        staticFeed: params.staticFeed,
        routeId: params.route.id,
        stopId: params.stopId,
        directionId: String(params.tripDescriptor?.directionId ?? ''),
        config: params.config,
    });

    return staticHeadsign || params.route.longName || params.route.shortName;
}

function getRealtimeDepartures(params: {
    staticFeed: GtfsStaticFeed;
    realtimeFeed: GtfsRealtimeBindings.transit_realtime.FeedMessage;
    stopIds: Set<string>;
    config: TransitWidgetConfig;
    now: Date;
}) {
    const nowEpochSeconds = Math.floor(params.now.getTime() / 1000);
    const maxEpochSeconds = nowEpochSeconds + DEPARTURE_HORIZON_SECONDS;
    const departures: TransitDeparture[] = [];

    for (const entity of params.realtimeFeed.entity) {
        const tripUpdate = entity.tripUpdate;
        const tripDescriptor = tripUpdate?.trip;
        const tripId = tripDescriptor?.tripId ?? '';
        const trip = tripId ? (params.staticFeed.trips.get(tripId) ?? null) : null;
        const routeId = trip?.routeId ?? tripDescriptor?.routeId ?? '';
        const route = routeId ? params.staticFeed.routes.get(routeId) : null;
        if (!route || !routeMatches(route, params.config)) continue;

        for (const stopTimeUpdate of tripUpdate?.stopTimeUpdate ?? []) {
            const stopId = stopTimeUpdate.stopId ?? '';
            if (!params.stopIds.has(stopId)) continue;

            const event = stopTimeUpdate.departure ?? stopTimeUpdate.arrival ?? null;
            const rawTime = Number(event?.time ?? 0);
            if (!rawTime || rawTime < nowEpochSeconds || rawTime > maxEpochSeconds) continue;

            const stop = params.staticFeed.stops.get(stopId);
            if (!stop) continue;
            const destination = getRealtimeDestination({
                staticFeed: params.staticFeed,
                trip,
                tripDescriptor,
                route,
                stopId,
                config: params.config,
            });
            if (!destinationMatches(destination, params.config)) continue;

            departures.push({
                stopId,
                stopName: stop.name,
                line: toTransitLine(route),
                destination,
                departureTime: new Date(rawTime * 1000).toISOString(),
                realtime: true,
            });
        }
    }

    return departures;
}

function getScheduledDepartures(params: {
    staticFeed: GtfsStaticFeed;
    stopIds: Set<string>;
    config: TransitWidgetConfig;
    now: Date;
}) {
    const nowSeconds = secondsSinceLocalMidnight(params.now);
    const maxSeconds = nowSeconds + DEPARTURE_HORIZON_SECONDS;
    const departures: TransitDeparture[] = [];

    for (const stopId of params.stopIds) {
        for (const stopTime of params.staticFeed.stopTimesByStopId.get(stopId) ?? []) {
            if (stopTime.departureSeconds < nowSeconds || stopTime.departureSeconds > maxSeconds) continue;

            const trip = params.staticFeed.trips.get(stopTime.tripId);
            if (!trip || !isServiceActive(params.staticFeed, trip.serviceId, params.now)) continue;

            const route = params.staticFeed.routes.get(trip.routeId);
            const stop = params.staticFeed.stops.get(stopId);
            if (!route || !stop || !routeMatches(route, params.config)) continue;
            const destination = trip.headsign || route.longName || route.shortName;
            if (!destinationMatches(destination, params.config)) continue;

            departures.push({
                stopId,
                stopName: stop.name,
                line: toTransitLine(route),
                destination,
                departureTime: new Date(params.now.getTime() + ((stopTime.departureSeconds - nowSeconds) * 1000)).toISOString(),
                realtime: false,
            });
        }
    }

    return departures;
}

function deduplicateAndLimit(departures: TransitDeparture[], maxDeparturesPerLine: number) {
    const counts = new Map<string, number>();
    const seen = new Set<string>();
    const result: TransitDeparture[] = [];

    for (const departure of departures.sort((a, b) => Date.parse(a.departureTime) - Date.parse(b.departureTime))) {
        const key = `${departure.stopId}:${departure.line.routeId}:${departure.destination}:${departure.departureTime}`;
        if (seen.has(key)) continue;

        const groupKey = `${departure.stopId}:${departure.line.routeId}:${departure.destination}`;
        const currentCount = counts.get(groupKey) ?? 0;
        if (currentCount >= maxDeparturesPerLine) continue;

        seen.add(key);
        counts.set(groupKey, currentCount + 1);
        result.push(departure);
    }

    return result;
}

export async function getTransitDepartures(config: TransitWidgetConfig, now = new Date()) {
    if (!config.providerId.trim()) {
        return {
            departures: [],
        };
    }

    const provider = await resolveTransitProvider(config.providerId);
    const staticFeed = await loadStaticTransitFeed(provider);
    const stopIds = new Set(findMatchingStops(staticFeed, config));

    if (stopIds.size === 0) {
        return {
            departures: [],
        };
    }

    try {
        const realtimeFeed = await loadRealtimeFeed(provider);
        const departures = getRealtimeDepartures({
            staticFeed,
            realtimeFeed,
            stopIds,
            config,
            now,
        });

        if (departures.length > 0) {
            return {
                departures: deduplicateAndLimit(departures, config.maxDeparturesPerLine),
            };
        }
    } catch {
        // Fall back to the static schedule below.
    }

    const scheduledDepartures = deduplicateAndLimit(getScheduledDepartures({
        staticFeed,
        stopIds,
        config,
        now,
    }), config.maxDeparturesPerLine);

    return {
        departures: scheduledDepartures,
    };
}
