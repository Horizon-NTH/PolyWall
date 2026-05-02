import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    getCachedAssetObjectUrl,
    loadCachedSnapshot,
    prefetchDisplayAssets,
    pruneDisplayCache,
    saveCachedSnapshot,
} from '@/lib/screens/display-cache';

describe('display-cache', () => {
    beforeEach(() => {
        const storage = new Map<string, string>();
        Object.defineProperty(window, 'localStorage', {
            writable: true,
            value: {
                getItem: vi.fn((key: string) => storage.get(key) ?? null),
                setItem: vi.fn((key: string, value: string) => {
                    storage.set(key, value);
                }),
                removeItem: vi.fn((key: string) => {
                    storage.delete(key);
                }),
            },
        });

        Object.defineProperty(URL, 'createObjectURL', {
            writable: true,
            value: vi.fn(() => 'blob:cached'),
        });
    });

    it('saves and reloads a cached snapshot', () => {
        const snapshot = {
            revision: 'rev-1',
            serverNow: '2026-05-02T10:00:00.000Z',
        };

        saveCachedSnapshot('device-1', snapshot as never);

        expect(loadCachedSnapshot('device-1')).toEqual(snapshot);
    });

    it('loads a cached asset from Cache Storage and returns an object URL', async () => {
        const cacheMatch = vi.fn().mockResolvedValue(new Response('hello', {
            status: 200,
            headers: {'Content-Type': 'text/plain'},
        }));
        Object.defineProperty(window, 'caches', {
            writable: true,
            value: {
                open: vi.fn().mockResolvedValue({
                    match: cacheMatch,
                }),
            },
        });

        const result = await getCachedAssetObjectUrl({
            assetId: 'asset-1',
            mediaFileId: 'file-1',
            cacheKey: 'cache-1',
            signedUrl: 'https://example.com/file.png',
            expiresAt: '2026-05-02T11:00:00.000Z',
            mimeType: 'image/png',
            width: 100,
            height: 100,
        });

        expect(result).toBe('blob:cached');
        expect(cacheMatch).toHaveBeenCalledTimes(1);
    });

    it('prunes entries outside the kept revision unless protected', async () => {
        window.localStorage.setItem(
            'polywall.display.asset-meta',
            JSON.stringify({
                keep: {revision: 'rev-keep', lastAccessedAt: '2026-05-02T10:00:00.000Z'},
                protected: {revision: 'rev-old', lastAccessedAt: '2026-05-02T09:00:00.000Z'},
                delete: {revision: 'rev-old', lastAccessedAt: '2026-05-02T08:00:00.000Z'},
            }),
        );

        const cacheDelete = vi.fn().mockResolvedValue(true);
        Object.defineProperty(window, 'caches', {
            writable: true,
            value: {
                open: vi.fn().mockResolvedValue({
                    delete: cacheDelete,
                }),
            },
        });

        await pruneDisplayCache({
            keepRevision: 'rev-keep',
            protectedCacheKeys: ['protected'],
        });

        expect(cacheDelete).toHaveBeenCalledTimes(1);
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
            'polywall.display.asset-meta',
            JSON.stringify({
                keep: {revision: 'rev-keep', lastAccessedAt: '2026-05-02T10:00:00.000Z'},
                protected: {revision: 'rev-old', lastAccessedAt: '2026-05-02T09:00:00.000Z'},
            }),
        );
    });

    it('prefetches remote assets into the cache', async () => {
        const cache = {
            match: vi.fn().mockResolvedValue(null),
            put: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(true),
        };
        Object.defineProperty(window, 'caches', {
            writable: true,
            value: {
                open: vi.fn().mockResolvedValue(cache),
            },
        });

        vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', {status: 200}));

        await prefetchDisplayAssets([
            {
                assetId: 'asset-1',
                mediaFileId: 'file-1',
                cacheKey: 'cache-1',
                signedUrl: 'https://example.com/file.png',
                expiresAt: '2026-05-02T11:00:00.000Z',
                mimeType: 'image/png',
                width: 100,
                height: 100,
            },
        ], 'rev-1');

        expect(fetch).toHaveBeenCalledWith('https://example.com/file.png', {cache: 'no-store'});
        expect(cache.put).toHaveBeenCalledTimes(1);
    });
});
