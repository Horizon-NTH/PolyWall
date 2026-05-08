'use client';

import * as React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { DisplayWidget } from '@/components/screens/display-widget-registry';
import { ZoneType } from '@/generated/prisma/enums';
import {
    type DisplayResolvedState,
    type DisplayRuntimeSnapshot,
    type DisplaySyncStatus,
    type DisplayTemplateZone,
} from '@/lib/display-runtime/types';
import { getRequiredStringConfig } from '@/lib/config/json-config';

export type TemplateRendererProps = {
    snapshot: DisplayRuntimeSnapshot;
    resolvedState: DisplayResolvedState;
    syncStatus: DisplaySyncStatus;
    assetSrc: string | null;
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

function getZoneStyle(zone: DisplayTemplateZone, snapshot: DisplayRuntimeSnapshot): React.CSSProperties {
    const {resolutionX, resolutionY} = snapshot.channel.template;

    return {
        left: `${(zone.positionX / resolutionX) * 100}%`,
        top: `${(zone.positionY / resolutionY) * 100}%`,
        width: `${(zone.width / resolutionX) * 100}%`,
        height: `${(zone.height / resolutionY) * 100}%`,
        zIndex: zone.orderIndex,
    };
}

function StaticZone({zone}: { zone: DisplayTemplateZone }) {
    const configurationJson = zone.configurationJson ?? {};
    const backgroundColor = getRequiredStringConfig(configurationJson, 'backgroundColor', 'transparent');
    const text = getRequiredStringConfig(configurationJson, 'text', '');
    const color = getRequiredStringConfig(configurationJson, 'color', '#ffffff');
    const imageUrl = getRequiredStringConfig(configurationJson, 'imageUrl', '');
    const fit = getRequiredStringConfig(configurationJson, 'fit', 'contain');

    return (
        <div className="flex h-full w-full items-center justify-center overflow-hidden p-4" style={{backgroundColor}}>
            {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={imageUrl}
                    alt={zone.name}
                    className="h-full w-full"
                    style={{objectFit: fit === 'cover' ? 'cover' : 'contain'}}
                    draggable={false}
                />
            ) : text ? (
                <p className="text-center text-[clamp(1rem,3vw,4rem)] font-semibold wrap-break-word" style={{color}}>
                    {text}
                </p>
            ) : null}
        </div>
    );
}

function WidgetZone({zone}: { zone: DisplayTemplateZone }) {
    const configurationJson = zone.configurationJson ?? {};
    const widget = zone.widgetInstance ?? null;
    const backgroundColor = getRequiredStringConfig(configurationJson, 'backgroundColor', 'transparent');
    const gap = typeof configurationJson.gap === 'number' ? configurationJson.gap : 12;

    return (
        <div className="flex h-full w-full flex-col overflow-hidden p-3" style={{backgroundColor, gap}}>
            {widget ? (
                <div className="min-h-0 flex-1 overflow-hidden">
                    <DisplayWidget widget={widget} />
                </div>
            ) : (
                <div className="flex h-full w-full items-center justify-center text-center text-white/70">
                    Aucun widget
                </div>
            )}
        </div>
    );
}

function DisplayLayoutRenderer(props: TemplateRendererProps) {
    const overlayLabel = props.syncStatus === 'DEGRADED'
        ? 'Mode dégradé'
        : props.syncStatus === 'SYNCING'
            ? 'Synchronisation'
            : null;
    const backgroundColor = getRequiredStringConfig(props.snapshot.channel.template.configurationJson ?? {}, 'backgroundColor', '#000000');

    return (
        <div className="relative h-full w-full overflow-hidden" style={{backgroundColor}}>
            {props.snapshot.channel.template.zones.map((zone) => (
                <div key={zone.id} className="absolute overflow-hidden" style={getZoneStyle(zone, props.snapshot)}>
                    {zone.zoneType === ZoneType.PLAYLIST ? (
                        <DisplayMediaViewport {...props} />
                    ) : zone.zoneType === ZoneType.WIDGET ? (
                        <WidgetZone zone={zone} />
                    ) : zone.zoneType === ZoneType.STATIC ? (
                        <StaticZone zone={zone} />
                    ) : null}
                </div>
            ))}
            {overlayLabel ? (
                <div className="absolute top-4 left-4 z-999 rounded-md bg-black/70 px-3 py-1 text-xs text-white">
                    {overlayLabel}
                </div>
            ) : null}
        </div>
    );
}

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
    if (props.resolvedState.status !== 'PLAYING') {
        return (
            <DisplayDiagnostic
                title="Diffusion indisponible"
                description={props.resolvedState.reason}
            />
        );
    }

    return <DisplayLayoutRenderer {...props} />;
}
