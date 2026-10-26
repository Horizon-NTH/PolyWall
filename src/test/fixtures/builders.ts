import { MediaFileStatus, ScheduleType, ScreenStatus, UserRole } from '@/generated/prisma/enums';
import type { z } from 'zod';
import type { adminCreateSchema, adminUpdateSchema } from '@/schemas/admin-schema';
import type { AdminRow } from '@/components/admins/admins-table';
import type { ChannelRow } from '@/components/channels/channels-table';
import type { DisplayTemplateRow } from '@/components/display-templates/display-templates-table';
import type { MediaGrid } from '@/components/media/media-grid';
import type { OrganizationRow } from '@/components/organizations/organizations-table';
import type { PlaylistRow } from '@/components/playlists/playlists-table';
import type { ScreenRow } from '@/components/screens/screens-table';
import type { UserRow } from '@/components/users/users-table';
import type { DisplayWidgetInstance } from '@/lib/display-runtime/types';
import type { PlaylistScheduleImpact } from '@/lib/playlists/playlist-schedule-impact';
import type { ScheduleViewModel } from '@/lib/schedules/schedule-view-model';
import type { TransitDeparture, TransitDeparturesResult } from '@/lib/transit/transit-types';
import type { userCreateSchema, userUpdateSchema } from '@/schemas/user-schema';

type MediaGridItem = Parameters<typeof MediaGrid>[0]['data'][number];

export const TEST_DATES = {
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    scheduleCreatedAt: '2026-04-01T09:00:00.000Z',
    scheduleUpdatedAt: '2026-04-01T10:00:00.000Z',
} as const;

export const buildAdminRow = (overrides: Partial<AdminRow> = {}): AdminRow => ({
    id: 'admin-1',
    fullName: 'Jean Dupont',
    email: 'jean@example.com',
    description: 'Admin principal',
    role: UserRole.ORGANIZATION_ADMIN,
    organizationId: 'org-1',
    organizationName: 'Org One',
    active: true,
    createdAt: TEST_DATES.createdAt,
    ...overrides,
});

export const buildUserRow = (overrides: Partial<UserRow> = {}): UserRow => ({
    id: 'user-1',
    fullName: 'Jean Dupont',
    email: 'jean@example.com',
    description: 'Gestionnaire',
    role: UserRole.CONTENT_MANAGER,
    active: true,
    createdAt: TEST_DATES.createdAt,
    ...overrides,
});

export const buildChannelRow = (overrides: Partial<ChannelRow> = {}): ChannelRow => ({
    id: 'channel-1',
    name: 'Hall principal',
    description: 'Canal du hall',
    displayTemplateName: 'Template 16:9',
    screensCount: 2,
    schedulesCount: 3,
    createdAt: TEST_DATES.createdAt,
    updatedAt: TEST_DATES.updatedAt,
    ...overrides,
});

export const buildDisplayTemplateRow = (
    overrides: Partial<DisplayTemplateRow> = {},
): DisplayTemplateRow => ({
    id: 'template-1',
    name: 'Template org',
    description: 'Template de l\'organisation',
    scope: 'organization',
    resolution: '1920x1080',
    zonesCount: 2,
    widgetsCount: 1,
    channelsCount: 0,
    updatedAt: TEST_DATES.updatedAt,
    ...overrides,
});

export const buildMediaGridItem = (overrides: Partial<MediaGridItem> = {}): MediaGridItem => ({
    id: 'media-1',
    title: 'Affiche Hall',
    description: 'Visuel principal',
    active: true,
    createdAt: TEST_DATES.createdAt,
    updatedAt: TEST_DATES.createdAt,
    kind: 'image',
    status: MediaFileStatus.READY,
    thumbUrl: null,
    sizeBytes: 1024,
    playlistUsage: {
        count: 0,
        playlistNames: [],
    },
    ...overrides,
});

export const buildOrganizationRow = (
    overrides: Partial<OrganizationRow> = {},
): OrganizationRow => ({
    id: 'org-1',
    name: 'Org One',
    description: 'Description One',
    createdAt: TEST_DATES.createdAt,
    usersCount: 2,
    screensCount: 1,
    channelsCount: 3,
    ...overrides,
});

export const buildScreenRow = (overrides: Partial<ScreenRow> = {}): ScreenRow => ({
    id: 'screen-1',
    name: 'Écran actif',
    location: 'Hall',
    channelId: 'channel-1',
    channelName: 'Hall principal',
    status: ScreenStatus.ACTIVE,
    interactive: true,
    lastSeenAt: TEST_DATES.updatedAt,
    createdAt: TEST_DATES.createdAt,
    updatedAt: TEST_DATES.updatedAt,
    ...overrides,
});

export const buildDisplayWidgetInstance = (
    overrides: Partial<DisplayWidgetInstance> = {},
): DisplayWidgetInstance => ({
    id: 'widget-1',
    technicalKey: 'clock',
    active: true,
    refreshPeriodSeconds: 30,
    configurationJson: {},
    ...overrides,
});

export const buildTransitDeparture = (
    overrides: Partial<TransitDeparture> = {},
): TransitDeparture => ({
    stopId: 'stop-1',
    stopName: 'Université',
    line: {
        routeId: 'route-t1',
        shortName: 'T1',
        longName: 'Tram T1',
        type: 0,
        color: '#be185d',
        textColor: '#ffffff',
    },
    destination: 'Gare centrale',
    departureTime: '2026-05-09T10:19:30.000Z',
    realtime: true,
    ...overrides,
});

export const buildTransitDeparturesResult = (
    overrides: Partial<TransitDeparturesResult> = {},
): TransitDeparturesResult => ({
    departures: [
        buildTransitDeparture(),
        buildTransitDeparture({departureTime: '2026-05-09T10:26:30.000Z'}),
    ],
    ...overrides,
});

export const buildPlaylistScheduleImpact = (
    overrides: Partial<PlaylistScheduleImpact> = {},
): PlaylistScheduleImpact => ({
    id: 'schedule-1',
    typeLabel: 'Récurrente',
    dateLabel: 'Toujours active',
    timeLabel: '08:00 - 10:00',
    ...overrides,
});

export const buildPlaylistRow = (overrides: Partial<PlaylistRow> = {}): PlaylistRow => ({
    id: 'playlist-1',
    name: 'Default',
    description: 'Playlist principale',
    mediaCount: 3,
    activeMediaCount: 2,
    totalDurationSeconds: 120,
    impactedSchedules: [buildPlaylistScheduleImpact()],
    createdAt: TEST_DATES.createdAt,
    updatedAt: TEST_DATES.updatedAt,
    ...overrides,
});

export const buildScheduleViewModel = (
    overrides: Partial<ScheduleViewModel> = {},
): ScheduleViewModel => ({
    id: 'schedule-1',
    type: ScheduleType.RECURRING,
    active: true,
    playlistId: 'playlist-1',
    playlistName: 'Actus',
    channelId: 'channel-1',
    channelName: 'Hall',
    startDate: null,
    endDate: null,
    daysLabel: 'Lun, Mar',
    dateLabel: 'Toujours active',
    timeLabel: '09:00 - 10:00',
    lifecycleStatus: 'ongoing',
    updatedAt: TEST_DATES.scheduleUpdatedAt,
    createdAt: TEST_DATES.scheduleCreatedAt,
    slots: [],
    ...overrides,
});

export const buildAdminCreatePayload = (
    overrides: Partial<z.infer<typeof adminCreateSchema>> = {},
): z.infer<typeof adminCreateSchema> => ({
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    description: 'Administrateur principal',
    role: UserRole.PLATFORM_SUPER_ADMIN,
    organizationId: null,
    password: 'Password123!',
    confirmPassword: 'Password123!',
    active: true,
    ...overrides,
});

export const buildAdminUpdatePayload = (
    overrides: Partial<z.infer<typeof adminUpdateSchema>> = {},
): z.infer<typeof adminUpdateSchema> => ({
    fullName: 'Admin',
    email: 'admin@example.com',
    description: 'Desc',
    role: UserRole.PLATFORM_SUPER_ADMIN,
    organizationId: null,
    active: true,
    ...overrides,
});

export const buildUserCreatePayload = (
    overrides: Partial<z.infer<typeof userCreateSchema>> = {},
): z.infer<typeof userCreateSchema> => ({
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    description: 'Gestionnaire principal',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    active: true,
    ...overrides,
});

export const buildUserUpdatePayload = (
    overrides: Partial<z.infer<typeof userUpdateSchema>> = {},
): z.infer<typeof userUpdateSchema> => ({
    fullName: 'User',
    email: 'user@example.com',
    description: 'Desc',
    active: true,
    ...overrides,
});
