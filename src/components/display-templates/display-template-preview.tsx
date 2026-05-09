'use client';

import { ZoneType } from '@/generated/prisma/enums';
import { getZonePreviewAppearanceStyle } from '@/lib/display-runtime/template-style';
import { cn } from '@/lib/utils';

export type DisplayTemplatePreviewZone = {
    id: string;
    name: string;
    zoneType: ZoneType;
    orderIndex: number;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    configurationJson?: Record<string, unknown> | null;
};

type DisplayTemplatePreviewProps = {
    resolutionX: number;
    resolutionY: number;
    zones: DisplayTemplatePreviewZone[];
    className?: string;
};

export function getZoneLabel(zoneType: ZoneType) {
    switch (zoneType) {
        case ZoneType.PLAYLIST:
            return 'Playlist';
        case ZoneType.WIDGET:
            return 'Widget';
        case ZoneType.STATIC:
            return 'Statique';
        default:
            return zoneType;
    }
}

function getZoneClass(zoneType: ZoneType) {
    switch (zoneType) {
        case ZoneType.PLAYLIST:
            return 'border-sky-300 bg-sky-500/25 text-sky-50';
        case ZoneType.WIDGET:
            return 'border-emerald-300 bg-emerald-500/25 text-emerald-50';
        case ZoneType.STATIC:
            return 'border-amber-300 bg-amber-500/25 text-amber-50';
        default:
            return 'border-white/40 bg-white/15 text-white';
    }
}

export function DisplayTemplatePreview({
                                           resolutionX,
                                           resolutionY,
                                           zones,
                                           className,
                                       }: DisplayTemplatePreviewProps) {
    return (
        <div
            className={cn('relative overflow-hidden rounded-md border bg-zinc-950', className)}
            style={{aspectRatio: `${resolutionX} / ${resolutionY}`}}
        >
            {zones.map((zone) => (
                <div
                    key={zone.id}
                    className={cn(
                        'absolute overflow-hidden rounded-sm border p-2 text-xs',
                        getZoneClass(zone.zoneType),
                    )}
                    style={{
                        left: `${(zone.positionX / resolutionX) * 100}%`,
                        top: `${(zone.positionY / resolutionY) * 100}%`,
                        width: `${(zone.width / resolutionX) * 100}%`,
                        height: `${(zone.height / resolutionY) * 100}%`,
                        zIndex: zone.orderIndex,
                        ...getZonePreviewAppearanceStyle(zone.configurationJson ?? {}, zone.zoneType),
                    }}
                >
                    <div className="truncate font-medium">{zone.name}</div>
                    <div className="truncate opacity-80">{getZoneLabel(zone.zoneType)}</div>
                </div>
            ))}
        </div>
    );
}
