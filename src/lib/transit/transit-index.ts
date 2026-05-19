import 'server-only';

import { loadStaticTransitFeed, toTransitLine } from '@/lib/transit/gtfs-service';
import { resolveTransitProvider, type ResolvedTransitProvider } from '@/lib/transit/transit-providers';
import {
    isAvailableGtfsScheduleResource,
    PAN_API_DATASETS_URL,
    type PanDataset,
} from '@/lib/transit/transit-pan';
import {
    type TransitDestinationOption,
    type TransitDisplayGroupOption,
    type TransitProviderIndex,
    type TransitProviderOption,
    type TransitRouteOption,
    type TransitStopOption,
} from '@/lib/transit/transit-types';

const PAN_PROVIDERS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const PROVIDER_INDEX_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const panProvidersCache: { expiresAt: number; providers: TransitProviderOption[] } = {
    expiresAt: 0,
    providers: [],
};
const providerIndexCache = new Map<string, { expiresAt: number; index: TransitProviderIndex }>();

function normalize(value: string) {
    return value.trim().toLocaleLowerCase('fr-FR');
}

function hasGtfsResource(dataset: PanDataset) {
    return (dataset.resources ?? []).some(isAvailableGtfsScheduleResource);
}

function matchesQuery(provider: TransitProviderOption, query: string) {
    if (!query) return true;
    const normalizedQuery = normalize(query);
    return normalize(`${provider.label} ${provider.id} ${provider.searchText ?? ''}`).includes(normalizedQuery);
}

function toTransitProviderOption(dataset: PanDataset): TransitProviderOption {
    return {
        id: `pan:${dataset.id}`,
        label: dataset.title || dataset.id,
        searchText: (dataset.covered_area ?? []).map((area) => area.nom).filter(Boolean).join(' '),
    };
}

async function fetchPanProviders() {
    if (panProvidersCache.expiresAt > Date.now()) return panProvidersCache.providers;

    const response = await fetch(PAN_API_DATASETS_URL, {cache: 'no-store'});
    if (!response.ok) {
        throw new Error(`PAN datasets request failed with status ${response.status}`);
    }

    const datasets = await response.json() as PanDataset[];
    const providers = datasets
        .filter(hasGtfsResource)
        .map(toTransitProviderOption)
        .sort((a, b) => a.label.localeCompare(b.label, 'fr-FR'));

    panProvidersCache.providers = providers;
    panProvidersCache.expiresAt = Date.now() + PAN_PROVIDERS_CACHE_TTL_MS;
    return providers;
}

export async function searchTransitProviders(query = '', limit = 500) {
    try {
        const panProviders = await fetchPanProviders();
        return panProviders
            .filter((provider) => matchesQuery(provider, query))
            .slice(0, limit);
    } catch {
        return [];
    }
}

function getProviderIndexCacheKey(provider: ResolvedTransitProvider) {
    return `${provider.id}:${provider.staticGtfsUrl}`;
}

export async function getTransitProviderIndex(params: {
    providerId: string;
}): Promise<TransitProviderIndex> {
    const provider = await resolveTransitProvider(
        params.providerId,
    );
    const cacheKey = getProviderIndexCacheKey(provider);
    const cached = providerIndexCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.index;

    const feed = await loadStaticTransitFeed(provider);
    const routeIdsByStopId = new Map<string, Set<string>>();
    const destinationsByStopId = new Map<string, Set<string>>();
    const destinationKeys = new Set<string>();
    const groupKeys = new Set<string>();
    const destinations: TransitDestinationOption[] = [];
    const groups: TransitDisplayGroupOption[] = [];

    for (const [stopId, stopTimes] of feed.stopTimesByStopId) {
        const routeIds = routeIdsByStopId.get(stopId) ?? new Set<string>();
        const stopDestinations = destinationsByStopId.get(stopId) ?? new Set<string>();

        for (const stopTime of stopTimes) {
            const trip = feed.trips.get(stopTime.tripId);
            if (!trip) continue;

            const route = feed.routes.get(trip.routeId);
            if (!route) continue;

            const destination = trip.headsign || route.longName || route.shortName;
            if (!destination) continue;

            routeIds.add(route.id);
            stopDestinations.add(destination);

            const destinationKey = `${route.id}:${destination}`;
            if (!destinationKeys.has(destinationKey)) {
                destinationKeys.add(destinationKey);
                destinations.push({routeId: route.id, destination});
            }

            const groupKey = `${stopId}:${route.id}:${destination}`;
            if (!groupKeys.has(groupKey)) {
                groupKeys.add(groupKey);
                groups.push({stopId, routeId: route.id, destination});
            }
        }

        routeIdsByStopId.set(stopId, routeIds);
        destinationsByStopId.set(stopId, stopDestinations);
    }

    const routes = Array.from(feed.routes.values())
        .map((route): TransitRouteOption => toTransitLine(route))
        .sort((a, b) => (a.shortName || a.longName).localeCompare(b.shortName || b.longName, 'fr-FR'));

    const stops = Array.from(feed.stops.values())
        .map((stop): TransitStopOption => ({
            id: stop.id,
            name: stop.name,
            routeIds: Array.from(routeIdsByStopId.get(stop.id) ?? []).sort(),
            destinations: Array.from(destinationsByStopId.get(stop.id) ?? []).sort((a, b) => a.localeCompare(b, 'fr-FR')),
        }))
        .filter((stop) => stop.routeIds.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name, 'fr-FR'));

    const index = {
        provider: {
            id: provider.id,
            label: provider.label,
        },
        stops,
        routes,
        destinations: destinations.sort((a, b) => a.destination.localeCompare(b.destination, 'fr-FR')),
        groups,
    };

    providerIndexCache.set(cacheKey, {index, expiresAt: Date.now() + PROVIDER_INDEX_CACHE_TTL_MS});
    return index;
}
