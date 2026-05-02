import { type DisplayAssetDescriptor, type DisplayRuntimeSnapshot } from '@/lib/display-runtime/types';

const SNAPSHOT_KEY_PREFIX = 'polywall.display.snapshot.';
const ASSET_META_KEY = 'polywall.display.asset-meta';
const DISPLAY_CACHE_NAME = 'polywall-display-v1';

type AssetMetaEntry = {
    revision: string;
    lastAccessedAt: string;
};

type AssetMetaMap = Record<string, AssetMetaEntry>;

function getSnapshotStorageKey(deviceId: string) {
    return `${SNAPSHOT_KEY_PREFIX}${deviceId}`;
}

function getStorage() {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }
    return window.localStorage;
}

function readAssetMeta(): AssetMetaMap {
    const storage = getStorage();
    if (!storage) return {};

    try {
        const raw = storage.getItem(ASSET_META_KEY);
        if (!raw) return {};
        return JSON.parse(raw) as AssetMetaMap;
    } catch {
        return {};
    }
}

function writeAssetMeta(meta: AssetMetaMap) {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(ASSET_META_KEY, JSON.stringify(meta));
}

function updateAssetMeta(cacheKey: string, revision: string) {
    const meta = readAssetMeta();
    meta[cacheKey] = {
        revision,
        lastAccessedAt: new Date().toISOString(),
    };
    writeAssetMeta(meta);
}

function touchAssetMeta(cacheKey: string) {
    const meta = readAssetMeta();
    const current = meta[cacheKey];
    if (!current) return;

    meta[cacheKey] = {
        ...current,
        lastAccessedAt: new Date().toISOString(),
    };
    writeAssetMeta(meta);
}

async function openDisplayCache() {
    if (typeof window === 'undefined' || !('caches' in window)) {
        return null;
    }
    return window.caches.open(DISPLAY_CACHE_NAME);
}

function createCacheRequest(cacheKey: string) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return new Request(new URL(`/_polywall/cache/${encodeURIComponent(cacheKey)}`, baseUrl).toString());
}

export function loadCachedSnapshot(deviceId: string) {
    const storage = getStorage();
    if (!storage) return null;

    try {
        const raw = storage.getItem(getSnapshotStorageKey(deviceId));
        if (!raw) return null;
        return JSON.parse(raw) as DisplayRuntimeSnapshot;
    } catch {
        return null;
    }
}

export function saveCachedSnapshot(deviceId: string, snapshot: DisplayRuntimeSnapshot) {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(getSnapshotStorageKey(deviceId), JSON.stringify(snapshot));
}

export async function getCachedAssetObjectUrl(asset: DisplayAssetDescriptor) {
    const cache = await openDisplayCache();
    if (!cache) return null;

    const response = await cache.match(createCacheRequest(asset.cacheKey));
    if (!response) return null;

    touchAssetMeta(asset.cacheKey);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

async function cacheDisplayAsset(asset: DisplayAssetDescriptor, revision: string) {
    const cache = await openDisplayCache();
    if (!cache) return false;

    const request = createCacheRequest(asset.cacheKey);
    const existing = await cache.match(request);
    if (existing) {
        updateAssetMeta(asset.cacheKey, revision);
        return true;
    }

    const response = await fetch(asset.signedUrl, {cache: 'no-store'});
    if (!response.ok) {
        return false;
    }

    await cache.put(request, response.clone());
    updateAssetMeta(asset.cacheKey, revision);
    return true;
}

export async function pruneDisplayCache(params: {
    keepRevision: string;
    protectedCacheKeys?: string[];
    forceCurrentRevision?: boolean;
}) {
    const cache = await openDisplayCache();
    if (!cache) return;

    const protectedKeys = new Set(params.protectedCacheKeys ?? []);
    const meta = readAssetMeta();
    const entries = Object.entries(meta).sort((left, right) =>
        left[1].lastAccessedAt.localeCompare(right[1].lastAccessedAt),
    );

    for (const [cacheKey, entry] of entries) {
        const shouldKeepCurrentRevision = !params.forceCurrentRevision && entry.revision === params.keepRevision;
        if (protectedKeys.has(cacheKey) || shouldKeepCurrentRevision) {
            continue;
        }

        await cache.delete(createCacheRequest(cacheKey));
        delete meta[cacheKey];
    }

    writeAssetMeta(meta);
}

export async function prefetchDisplayAssets(
    assets: DisplayAssetDescriptor[],
    revision: string,
    protectedCacheKeys: string[] = [],
) {
    for (const asset of assets) {
        try {
            const cached = await cacheDisplayAsset(asset, revision);
            if (cached) {
                continue;
            }
        } catch (error) {
            const quotaExceeded = error instanceof DOMException && error.name === 'QuotaExceededError';
            if (!quotaExceeded) {
                continue;
            }
        }

        try {
            await pruneDisplayCache({
                keepRevision: revision,
                protectedCacheKeys,
                forceCurrentRevision: true,
            });
            await cacheDisplayAsset(asset, revision);
        } catch {
            // Best effort cache: playback can still fall back to signed URLs.
        }
    }
}
