'use client';

import * as React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DisplayWidget } from '@/components/screens/display-widget-registry';
import { DisplayPlaylistCarousel } from '@/components/screens/display-playlist-carousel';
import { DisplaySequenceMedia } from '@/components/screens/display-sequence-media';
import { ZoneType } from '@/generated/prisma/enums';
import {
    type DisplayResolvedState,
    type DisplayRuntimeSnapshot,
    type DisplaySyncStatus,
    type DisplayTemplateZone,
} from '@/lib/display-runtime/types';
import { getRequiredStringConfig } from '@/lib/config/json-config';
import { isTransparentBackground } from '@/lib/display-runtime/color-contrast';
import { getZoneAppearanceStyle } from '@/lib/display-runtime/template-style';

export type TemplateRendererProps = {
    snapshot: DisplayRuntimeSnapshot;
    resolvedState: DisplayResolvedState;
    syncStatus: DisplaySyncStatus;
    assetSrc: string | null;
    deviceId?: string | null;
    playlistAssetSrcByCacheKey?: Record<string, string>;
    staticAssetSrcByCacheKey?: Record<string, string>;
};

function DisplayMediaViewport(props: TemplateRendererProps) {
    if (props.resolvedState.status !== 'PLAYING') {
        return null;
    }

    return (
        <DisplaySequenceMedia
            item={props.resolvedState.currentItem}
            src={props.assetSrc}
            playing
            itemOffsetSeconds={props.resolvedState.itemOffsetSeconds}
        />
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

function StaticZone({
                        zone,
                        staticAssetSrcByCacheKey,
                    }: {
    zone: DisplayTemplateZone;
    staticAssetSrcByCacheKey?: Record<string, string>;
}) {
    const configurationJson = zone.configurationJson ?? {};
    const text = getRequiredStringConfig(configurationJson, 'text', '');
    const color = getRequiredStringConfig(configurationJson, 'color', '#ffffff');
    const fit = getRequiredStringConfig(configurationJson, 'fit', 'contain');
    const imageUrl = zone.staticMediaAsset
        ? staticAssetSrcByCacheKey?.[zone.staticMediaAsset.cacheKey] ?? zone.staticMediaAsset.signedUrl
        : '';

    return (
        <div
            className="flex h-full w-full items-center justify-center overflow-hidden"
            style={getZoneAppearanceStyle(configurationJson, zone.zoneType)}
        >
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

function resolveWidgetZoneConfiguration(
    zoneConfiguration: Record<string, unknown>,
    templateBackgroundColor: string,
) {
    if (!isTransparentBackground(zoneConfiguration.backgroundColor)) {
        return zoneConfiguration;
    }

    return {
        ...zoneConfiguration,
        backgroundColor: templateBackgroundColor,
    };
}

function WidgetZone({
                        zone,
                        deviceId,
                        templateBackgroundColor,
                    }: {
    zone: DisplayTemplateZone;
    deviceId?: string | null;
    templateBackgroundColor: string;
}) {
    const configurationJson = zone.configurationJson ?? {};
    const widgetConfiguration = resolveWidgetZoneConfiguration(configurationJson, templateBackgroundColor);
    const widget = zone.widgetInstance ?? null;
    const gap = typeof configurationJson.gap === 'number' ? configurationJson.gap : 12;

    return (
        <div
            className="flex h-full w-full flex-col overflow-hidden"
            style={{...getZoneAppearanceStyle(configurationJson, zone.zoneType), gap}}
        >
            {widget ? (
                <div className="min-h-0 flex-1 overflow-hidden">
                    <DisplayWidget widget={widget} deviceId={deviceId} zoneConfiguration={widgetConfiguration} />
                </div>
            ) : (
                <div className="flex h-full w-full items-center justify-center text-center text-white/70">
                    Aucun widget
                </div>
            )}
        </div>
    );
}

function DisplayPlaylistZone(props: TemplateRendererProps & { zone: DisplayTemplateZone }) {
    const configurationJson = props.zone.configurationJson ?? {};
    const displayMode = getRequiredStringConfig(configurationJson, 'displayMode', 'fullscreen');

    return (
        <div
            className="h-full w-full overflow-hidden"
            style={getZoneAppearanceStyle(configurationJson, props.zone.zoneType)}
        >
            {displayMode === 'carousel' ? (
                props.resolvedState.status === 'PLAYING' && props.resolvedState.playlist.items.length > 1 ? (
                    <DisplayPlaylistCarousel {...props} configurationJson={configurationJson} />
                ) : (
                    <DisplayMediaViewport {...props} />
                )
            ) : (
                <DisplayMediaViewport {...props} />
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
                <div
                    key={zone.id}
                    className="absolute overflow-hidden"
                    style={getZoneStyle(zone, props.snapshot)}
                >
                    {zone.zoneType === ZoneType.PLAYLIST ? (
                        <DisplayPlaylistZone {...props} zone={zone} />
                    ) : zone.zoneType === ZoneType.WIDGET ? (
                        <WidgetZone
                            zone={zone}
                            deviceId={props.deviceId}
                            templateBackgroundColor={backgroundColor}
                        />
                    ) : zone.zoneType === ZoneType.STATIC ? (
                        <StaticZone zone={zone} staticAssetSrcByCacheKey={props.staticAssetSrcByCacheKey} />
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
