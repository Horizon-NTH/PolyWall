import 'server-only';

import {
    getPanResourceUrl,
    isAvailableGtfsScheduleResource,
    normalizePanResourceFormat,
    PAN_API_DATASETS_URL,
    type PanDataset,
    type PanDatasetResource,
} from '@/lib/transit/transit-pan';

export type ResolvedTransitProvider = {
    id: string;
    label: string;
    staticGtfsUrl: string;
    tripUpdatesUrl: string | null;
};

const PAN_DATASET_CACHE_TTL_MS = 60 * 60 * 1000;
const panDatasetCache = new Map<string, { expiresAt: number; dataset: PanDataset }>();

function getGtfsTripUpdatesResourceScore(resource: PanDatasetResource) {
    if (
        resource.is_available === false ||
        normalizePanResourceFormat(resource.format) !== 'gtfs-rt' ||
        !getPanResourceUrl(resource)
    ) {
        return 0;
    }

    const searchable = `${resource.title ?? ''} ${resource.url ?? ''} ${resource.original_url ?? ''}`.toLocaleLowerCase('fr-FR');
    if (/vehicle|position/.test(searchable)) return 0;
    if (/trip.?updates?|trip_update/.test(searchable)) return 3;
    if (/horaire|passage/.test(searchable)) return 2;
    if (/temps.?r[eé]el|realtime/.test(searchable)) return 1;
    return 0;
}

function findGtfsTripUpdatesResource(resources: PanDatasetResource[]) {
    return resources
        .map((resource) => ({resource, score: getGtfsTripUpdatesResourceScore(resource)}))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)[0]?.resource ?? null;
}

async function fetchPanDataset(datasetId: string) {
    const cached = panDatasetCache.get(datasetId);
    if (cached && cached.expiresAt > Date.now()) return cached.dataset;

    const response = await fetch(`${PAN_API_DATASETS_URL}/${encodeURIComponent(datasetId)}`, {cache: 'no-store'});
    if (!response.ok) {
        throw new Error(`PAN dataset request failed with status ${response.status}`);
    }

    const dataset = await response.json() as PanDataset;
    panDatasetCache.set(datasetId, {dataset, expiresAt: Date.now() + PAN_DATASET_CACHE_TTL_MS});
    return dataset;
}

function resolveFromDataset(params: {
    providerId: string;
    dataset: PanDataset;
}): ResolvedTransitProvider {
    const resources = params.dataset.resources ?? [];
    const staticGtfsUrl = getPanResourceUrl(resources.find(isAvailableGtfsScheduleResource) ?? {});
    const tripUpdatesUrl = getPanResourceUrl(findGtfsTripUpdatesResource(resources) ?? {}) ||
        null;

    if (!staticGtfsUrl) {
        throw new Error(`No GTFS resource found for PAN dataset ${params.dataset.id}`);
    }

    return {
        id: params.providerId,
        label: params.dataset.title || `Dataset PAN ${params.dataset.id}`,
        staticGtfsUrl,
        tripUpdatesUrl,
    };
}

export async function resolveTransitProvider(
    providerId: string | undefined,
) {
    const datasetId = providerId?.startsWith('pan:') ? providerId.slice(4).trim() : '';
    if (!datasetId) {
        throw new Error('PAN provider id is required');
    }

    const dataset = await fetchPanDataset(datasetId);
    return resolveFromDataset({
        providerId: `pan:${datasetId}`,
        dataset,
    });
}
