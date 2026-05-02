'use client';

import * as React from 'react';

import { DisplayTemplateShell } from '@/components/screens/display-template-shell';
import { resolveDisplayState } from '@/lib/display-runtime/runtime';
import { type DisplayRuntimeSnapshot, type DisplaySyncStatus } from '@/lib/display-runtime/types';
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
    const activeObjectUrlRef = React.useRef<string | null>(null);

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

    React.useEffect(() => () => {
        if (activeObjectUrlRef.current) {
            URL.revokeObjectURL(activeObjectUrlRef.current);
        }
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
            />
        </div>
    );
}
