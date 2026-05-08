import { type DayOfWeek, type ScheduleType, type ZoneType } from '@/generated/prisma/enums';
import { type MediaKind } from '@/lib/media/media-view-model';

export type DisplayAssetDescriptor = {
    assetId: string;
    mediaFileId: string;
    cacheKey: string;
    signedUrl: string;
    expiresAt: string;
    mimeType: string;
    width: number | null;
    height: number | null;
};

export type DisplaySequenceItem = {
    id: string;
    playlistItemId: string;
    mediaItemId: string;
    mediaTitle: string;
    mediaKind: MediaKind;
    durationSeconds: number;
    orderIndex: number;
    frameIndex: number;
    asset: DisplayAssetDescriptor;
};

export type DisplayPlaylistSequence = {
    playlistId: string;
    playlistName: string;
    totalDurationSeconds: number;
    items: DisplaySequenceItem[];
};

export type DisplayRuntimeScheduleSlot = {
    dayOfWeek: DayOfWeek;
    startMinutes: number;
    endMinutes: number;
};

export type DisplayRuntimeSchedule = {
    id: string;
    type: ScheduleType;
    active: boolean;
    playlistId: string;
    playlistName: string;
    startDate: string | null;
    endDate: string | null;
    slots: DisplayRuntimeScheduleSlot[];
    updatedAt: string;
};

export type DisplayTemplateZone = {
    id: string;
    name: string;
    zoneType: ZoneType;
    orderIndex: number;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    configurationJson?: Record<string, unknown>;
    widgetInstance?: DisplayWidgetInstance | null;
};

export type DisplayWidgetInstance = {
    id: string;
    technicalKey: string;
    active: boolean;
    refreshPeriodSeconds: number;
    configurationJson: Record<string, unknown>;
};

export type DisplayRuntimeSnapshot = {
    revision: string;
    serverNow: string;
    screen: {
        screenId: string;
        channelId: string;
        interactive: boolean;
        interactiveUrl: string | null;
        inactivityTimeoutSeconds: number | null;
    };
    channel: {
        id: string;
        name: string;
        timezone: string;
        template: {
            id: string;
            name: string;
            templateKey: string;
            resolutionX: number;
            resolutionY: number;
            configurationJson?: Record<string, unknown>;
            zones: DisplayTemplateZone[];
        };
    };
    schedules: DisplayRuntimeSchedule[];
    playlists: DisplayPlaylistSequence[];
};

export type DisplayResolvedState =
    | {
    status: 'PLAYING';
    schedule: DisplayRuntimeSchedule;
    playlist: DisplayPlaylistSequence;
    currentItem: DisplaySequenceItem;
    nextTransitionAt: string;
    slotStartedAt: string;
    slotEndsAt: string;
    loopOffsetSeconds: number;
    itemOffsetSeconds: number;
    isFallbackToDefault: boolean;
    reason: string | null;
}
    | {
    status: 'NO_ACTIVE_SCHEDULE' | 'NO_DIFFUSABLE_PLAYLIST';
    schedule: DisplayRuntimeSchedule | null;
    playlist: DisplayPlaylistSequence | null;
    currentItem: null;
    nextTransitionAt: null;
    slotStartedAt: string | null;
    slotEndsAt: string | null;
    loopOffsetSeconds: 0;
    itemOffsetSeconds: 0;
    isFallbackToDefault: boolean;
    reason: string;
};

export type DisplaySyncStatus =
    | 'PAIRING'
    | 'PENDING'
    | 'SYNCING'
    | 'PLAYING'
    | 'DEGRADED'
    | 'INTERRUPTION'
    | 'REVOKED'
    | 'ERROR';
