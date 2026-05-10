'use client';

import * as React from 'react';

import { DisplayTemplateShell } from '@/components/screens/display-template-shell';
import { resolveDisplayState } from '@/lib/display-runtime/runtime';
import { type DisplayAssetDescriptor, type DisplayRuntimeSnapshot, type DisplaySyncStatus } from '@/lib/display-runtime/types';
import { getCachedAssetObjectUrl } from '@/lib/screens/display-cache';
import { cn } from '@/lib/utils';

type DisplayPlaybackSurfaceProps = {
    snapshot: DisplayRuntimeSnapshot;
    syncStatus: DisplaySyncStatus;
    serverOffsetMs: number;
    className?: string;
    onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
};

export function DisplayPlaybackSurface({
    snapshot,
    syncStatus,
    serverOffsetMs,
    className,
    onPointerDown,
}: DisplayPlaybackSurfaceProps) {
    const [renderNowMs, setRenderNowMs] = React.useState(() => Date.now());
    const [assetSrc, setAssetSrc] = React.useState<string | null>(null);
    const [staticAssetSrcByCacheKey, setStaticAssetSrcByCacheKey] = React.useState<Record<string, string>>({});
    const activeObjectUrlRef = React.useRef<string | null>(null);
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
    const currentAssetKey = resolvedState.status === 'PLAYING' ? resolvedState.currentItem.asset.cacheKey : null;
    const currentSignedUrl = resolvedState.status === 'PLAYING' ? resolvedState.currentItem.asset.signedUrl : null;
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
        if (!currentAsset) {
            if (activeObjectUrlRef.current) {
                URL.revokeObjectURL(activeObjectUrlRef.current);
                activeObjectUrlRef.current = null;
            }
            return;
        }

        let cancelled = false;

        const loadAsset = async () => {
            const cachedObjectUrl = await getCachedAssetObjectUrl(currentAsset);
            if (cancelled) {
                if (cachedObjectUrl) {
                    URL.revokeObjectURL(cachedObjectUrl);
                }
                return;
            }

            if (activeObjectUrlRef.current) {
                URL.revokeObjectURL(activeObjectUrlRef.current);
                activeObjectUrlRef.current = null;
            }

            if (cachedObjectUrl) {
                activeObjectUrlRef.current = cachedObjectUrl;
                setAssetSrc(cachedObjectUrl);
                return;
            }

            setAssetSrc(currentAsset.signedUrl);
        };

        void loadAsset();

        return () => {
            cancelled = true;
        };
    }, [currentAsset, currentAssetKey, currentSignedUrl]);

    React.useEffect(() => {
        let cancelled = false;

        const loadStaticAssets = async () => {
            const nextSources: Record<string, string> = {};
            const nextObjectUrls: string[] = [];

            for (const asset of staticAssets) {
                const cachedObjectUrl = await getCachedAssetObjectUrl(asset);
                if (cancelled) {
                    if (cachedObjectUrl) {
                        URL.revokeObjectURL(cachedObjectUrl);
                    }
                    continue;
                }

                if (cachedObjectUrl) {
                    nextSources[asset.cacheKey] = cachedObjectUrl;
                    nextObjectUrls.push(cachedObjectUrl);
                } else {
                    nextSources[asset.cacheKey] = asset.signedUrl;
                }
            }

            if (cancelled) {
                nextObjectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
                return;
            }

            activeStaticObjectUrlsRef.current.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
            activeStaticObjectUrlsRef.current = nextObjectUrls;
            setStaticAssetSrcByCacheKey(nextSources);
        };

        void loadStaticAssets();

        return () => {
            cancelled = true;
        };
    }, [staticAssetKeys, staticAssets]);

    React.useEffect(() => () => {
        if (activeObjectUrlRef.current) {
            URL.revokeObjectURL(activeObjectUrlRef.current);
        }
        activeStaticObjectUrlsRef.current.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    }, []);

    const visibleAssetSrc = currentAsset ? assetSrc : null;

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
                staticAssetSrcByCacheKey={staticAssetSrcByCacheKey}
            />
        </div>
    );
}
