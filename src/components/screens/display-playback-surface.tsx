'use client';

import * as React from 'react';

import { DisplayTemplateShell } from '@/components/screens/display-template-shell';
import { resolveDisplayState } from '@/lib/display-runtime/runtime';
import {
    type DisplayAssetDescriptor,
    type DisplayRuntimeSnapshot,
    type DisplaySequenceItem,
    type DisplaySyncStatus,
} from '@/lib/display-runtime/types';
import { getCachedAssetObjectUrl } from '@/lib/screens/display-cache';
import { cn } from '@/lib/utils';

type DisplayPlaybackSurfaceProps = {
    snapshot: DisplayRuntimeSnapshot;
    syncStatus: DisplaySyncStatus;
    serverOffsetMs: number;
    className?: string;
    onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
};

// Keep a stable empty array reference for hook dependencies.
const EMPTY_PLAYLIST_ITEMS: DisplaySequenceItem[] = [];

export function DisplayPlaybackSurface({
                                           snapshot,
                                           syncStatus,
                                           serverOffsetMs,
                                           className,
                                           onPointerDown,
                                       }: DisplayPlaybackSurfaceProps) {
    const [renderNowMs, setRenderNowMs] = React.useState(() => Date.now());
    const [playlistAssetSrcByCacheKey, setPlaylistAssetSrcByCacheKey] = React.useState<Record<string, string>>({});
    const [staticAssetSrcByCacheKey, setStaticAssetSrcByCacheKey] = React.useState<Record<string, string>>({});
    const activePlaylistObjectUrlsRef = React.useRef<string[]>([]);
    const activeStaticObjectUrlsRef = React.useRef<string[]>([]);

    React.useEffect(() => {
        const clockInterval = window.setInterval(() => {
            setRenderNowMs(Date.now());
        }, 250);

        return () => {
            window.clearInterval(clockInterval);
        };
    }, []);

    const resolvedState = React.useMemo(
        () => resolveDisplayState(snapshot, renderNowMs + serverOffsetMs),
        [renderNowMs, serverOffsetMs, snapshot],
    );

    const currentAsset = resolvedState.status === 'PLAYING' ? resolvedState.currentItem.asset : null;
    const currentSignedUrl = resolvedState.status === 'PLAYING' ? resolvedState.currentItem.asset.signedUrl : null;
    const resolvedPlaylistItems = resolvedState.status === 'PLAYING'
        ? resolvedState.playlist.items
        : EMPTY_PLAYLIST_ITEMS;
    const resolvedCurrentItem = resolvedState.status === 'PLAYING' ? resolvedState.currentItem : null;
    const playlistWindowAssets = React.useMemo(
        () => getPlaylistWindowAssets(resolvedCurrentItem, resolvedPlaylistItems),
        [resolvedCurrentItem, resolvedPlaylistItems],
    );
    const playlistWindowAssetKeys = React.useMemo(
        () => playlistWindowAssets.map((asset) => `${asset.cacheKey}:${asset.signedUrl}`).join('|'),
        [playlistWindowAssets],
    );
    const staticAssets = React.useMemo(() => {
        const seen = new Set<string>();
        const assets: DisplayAssetDescriptor[] = [];

        for (const zone of snapshot.channel.template.zones) {
            const asset = zone.staticMediaAsset;
            if (!asset || seen.has(asset.cacheKey)) continue;

            seen.add(asset.cacheKey);
            assets.push(asset);
        }

        return assets;
    }, [snapshot]);
    const staticAssetKeys = React.useMemo(
        () => staticAssets.map((asset) => asset.cacheKey).join('|'),
        [staticAssets],
    );

    React.useEffect(() => {
        let cancelled = false;

        const loadPlaylistAssets = async () => {
            const result = await loadAssetSources(playlistWindowAssets, () => cancelled);
            if (!result) return;

            activePlaylistObjectUrlsRef.current.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
            activePlaylistObjectUrlsRef.current = result.objectUrls;
            setPlaylistAssetSrcByCacheKey(result.sources);
        };

        void loadPlaylistAssets();

        return () => {
            cancelled = true;
        };
    }, [playlistWindowAssetKeys, playlistWindowAssets]);

    React.useEffect(() => {
        let cancelled = false;

        const loadStaticAssets = async () => {
            const result = await loadAssetSources(staticAssets, () => cancelled);
            if (!result) return;

            activeStaticObjectUrlsRef.current.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
            activeStaticObjectUrlsRef.current = result.objectUrls;
            setStaticAssetSrcByCacheKey(result.sources);
        };

        void loadStaticAssets();

        return () => {
            cancelled = true;
        };
    }, [staticAssetKeys, staticAssets]);

    React.useEffect(() => () => {
        activePlaylistObjectUrlsRef.current.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
        activeStaticObjectUrlsRef.current.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    }, []);

    const visibleAssetSrc = currentAsset
        ? playlistAssetSrcByCacheKey[currentAsset.cacheKey] ?? currentSignedUrl
        : null;

    return (
        <div
            className={cn('relative h-full w-full overflow-hidden bg-black', className)}
            onPointerDown={onPointerDown}
        >
            <DisplayTemplateShell
                snapshot={snapshot}
                resolvedState={resolvedState}
                syncStatus={syncStatus}
                assetSrc={visibleAssetSrc}
                playlistAssetSrcByCacheKey={playlistAssetSrcByCacheKey}
                staticAssetSrcByCacheKey={staticAssetSrcByCacheKey}
            />
        </div>
    );
}

function getPlaylistWindowAssets(currentItem: DisplaySequenceItem | null, items: DisplaySequenceItem[]) {
    if (!currentItem) return [];

    const currentIndex = items.findIndex((item) => item.id === currentItem.id);
    if (currentIndex < 0) return [currentItem.asset];

    const indexes = items.length > 1
        ? [currentIndex - 1, currentIndex, currentIndex + 1]
        : [currentIndex];
    const seen = new Set<string>();
    const assets: DisplayAssetDescriptor[] = [];

    for (const index of indexes) {
        const normalizedIndex = ((index % items.length) + items.length) % items.length;
        const item = normalizedIndex === currentIndex
            ? currentItem
            : items[normalizedIndex];
        if (!item || seen.has(item.asset.cacheKey)) continue;

        seen.add(item.asset.cacheKey);
        assets.push(item.asset);
    }

    return assets;
}

async function loadAssetSources(
    assets: DisplayAssetDescriptor[],
    isCancelled: () => boolean,
): Promise<{ sources: Record<string, string>; objectUrls: string[] } | null> {
    const sources: Record<string, string> = {};
    const objectUrls: string[] = [];

    for (const asset of assets) {
        const cachedObjectUrl = await getCachedAssetObjectUrl(asset);
        if (isCancelled()) {
            if (cachedObjectUrl) URL.revokeObjectURL(cachedObjectUrl);
            objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
            return null;
        }

        if (cachedObjectUrl) {
            sources[asset.cacheKey] = cachedObjectUrl;
            objectUrls.push(cachedObjectUrl);
        } else {
            sources[asset.cacheKey] = asset.signedUrl;
        }
    }

    return {sources, objectUrls};
}
