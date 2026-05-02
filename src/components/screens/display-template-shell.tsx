'use client';

import * as React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
    type DisplayResolvedState,
    type DisplayRuntimeSnapshot,
    type DisplaySyncStatus,
} from '@/lib/display-runtime/types';
import { isTemplateSupportedForV1 } from '@/lib/display-runtime/runtime';

export type TemplateRendererProps = {
    snapshot: DisplayRuntimeSnapshot;
    resolvedState: DisplayResolvedState;
    syncStatus: DisplaySyncStatus;
    assetSrc: string | null;
};

export type TemplateRenderer = {
    canRender: (snapshot: DisplayRuntimeSnapshot) => boolean;
    render: (props: TemplateRendererProps) => React.ReactNode;
};

function DisplayMediaViewport(props: TemplateRendererProps) {
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const activeVideoItemId = props.resolvedState.status === 'PLAYING' && props.resolvedState.currentItem.mediaKind === 'video'
        ? props.resolvedState.currentItem.id
        : null;

    React.useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement || props.resolvedState.status !== 'PLAYING' || props.resolvedState.currentItem.mediaKind !== 'video') {
            return;
        }

        const targetTime = props.resolvedState.itemOffsetSeconds;
        const syncVideo = () => {
            if (Math.abs(videoElement.currentTime - targetTime) > 0.75) {
                videoElement.currentTime = targetTime;
            }
        };

        syncVideo();
        videoElement.addEventListener('loadedmetadata', syncVideo);

        return () => {
            videoElement.removeEventListener('loadedmetadata', syncVideo);
        };
    }, [
        activeVideoItemId,
        props.assetSrc,
        props.resolvedState.currentItem?.mediaKind,
        props.resolvedState.itemOffsetSeconds,
        props.resolvedState.status,
    ]);

    if (props.resolvedState.status !== 'PLAYING') {
        return null;
    }

    if (!props.assetSrc) {
        return <Skeleton className="h-full w-full rounded-none" />;
    }

    if (props.resolvedState.currentItem.mediaKind === 'video') {
        return (
            <div className="flex h-full w-full items-center justify-center overflow-hidden">
                <video
                    ref={videoRef}
                    key={props.resolvedState.currentItem.id}
                    src={props.assetSrc}
                    autoPlay
                    muted
                    playsInline
                    preload="auto"
                    className="h-full w-full object-contain"
                />
            </div>
        );
    }

    return (
        <div className="flex h-full w-full items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={props.assetSrc}
                alt={props.resolvedState.currentItem.mediaTitle}
                className="h-full w-full object-contain"
                draggable={false}
            />
        </div>
    );
}

function SinglePlaylistRenderer(props: TemplateRendererProps) {
    const overlayLabel = props.syncStatus === 'DEGRADED'
        ? 'Mode dégradé'
        : props.syncStatus === 'SYNCING'
            ? 'Synchronisation'
            : null;

    return (
        <div className="relative h-full w-full overflow-hidden bg-black">
            <DisplayMediaViewport {...props} />
            {overlayLabel ? (
                <div className="absolute top-4 left-4 rounded-md bg-black/70 px-3 py-1 text-xs text-white">
                    {overlayLabel}
                </div>
            ) : null}
        </div>
    );
}

const singlePlaylistRenderer: TemplateRenderer = {
    canRender: (snapshot) => isTemplateSupportedForV1(snapshot.channel.template.zones),
    render: (props) => <SinglePlaylistRenderer {...props} />,
};

const RENDERERS: TemplateRenderer[] = [singlePlaylistRenderer];

function DisplayDiagnostic({title, description}: { title: string; description: string }) {
    return (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black p-6">
            <div className="w-full max-w-xl">
                <Alert>
                    <AlertTitle>{title}</AlertTitle>
                    <AlertDescription>{description}</AlertDescription>
                </Alert>
            </div>
        </div>
    );
}

export function DisplayTemplateShell(props: TemplateRendererProps) {
    const renderer = RENDERERS.find((candidate) => candidate.canRender(props.snapshot));

    if (!renderer) {
        return (
            <DisplayDiagnostic
                title="Modèle d’affichage incompatible"
                description="La V1 du player prend en charge uniquement un modèle avec une unique zone PLAYLIST plein écran."
            />
        );
    }

    if (props.resolvedState.status !== 'PLAYING') {
        return (
            <DisplayDiagnostic
                title="Diffusion indisponible"
                description={props.resolvedState.reason}
            />
        );
    }

    return <>{renderer.render(props)}</>;
}
