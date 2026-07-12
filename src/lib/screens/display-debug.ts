import { ScheduleType, ZoneType } from '@/generated/prisma/enums';
import { type DisplayRuntimeSnapshot, type DisplaySyncStatus } from '@/lib/display-runtime/types';
import { ALL_DAYS_OF_WEEK } from '@/lib/schedules/schedule-utils';

export const DISPLAY_DEBUG_PRESET_STORAGE_KEY = 'polywall.display.debug-preset';

export type DisplayDebugPreset =
    | 'live'
    | 'pairing'
    | 'pending'
    | 'playing'
    | 'syncing'
    | 'degraded'
    | 'revoked'
    | 'error'
    | 'no-active-schedule'
    | 'no-diffusable-playlist';

export type DisplayDebugScenario = {
    preset: Exclude<DisplayDebugPreset, 'live'>;
    label: string;
    description: string;
    syncStatus: DisplaySyncStatus;
    snapshot: DisplayRuntimeSnapshot | null;
    errorMessage: string | null;
};

const SAMPLE_IMAGE_DATA_URL =
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
  <rect width="1920" height="1080" fill="#050816" />
  <rect x="120" y="120" width="1680" height="840" rx="36" fill="#101828" stroke="#1f2a44" stroke-width="8" />
  <circle cx="420" cy="420" r="160" fill="#1d4ed8" opacity="0.9" />
  <circle cx="1500" cy="720" r="220" fill="#0f766e" opacity="0.85" />
  <rect x="620" y="300" width="760" height="96" rx="24" fill="#f8fafc" opacity="0.96" />
  <rect x="620" y="440" width="560" height="48" rx="18" fill="#cbd5e1" opacity="0.9" />
  <rect x="620" y="528" width="680" height="48" rx="18" fill="#94a3b8" opacity="0.85" />
  <text x="620" y="360" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#0f172a">Polywall Debug</text>
  <text x="620" y="612" font-family="Arial, sans-serif" font-size="32" fill="#e2e8f0">Aperçu de diffusion simulé</text>
</svg>
`);

function buildBaseSnapshot(): DisplayRuntimeSnapshot {
    return {
        revision: 'debug-revision',
        serverNow: '2026-04-26T10:00:00.000Z',
        screen: {
            screenId: 'debug-screen',
            channelId: 'debug-channel',
            interactive: false,
            interactiveUrl: null,
        },
        channel: {
            id: 'debug-channel',
            name: 'Canal debug',
            timezone: 'Europe/Paris',
            template: {
                id: 'debug-template',
                name: 'Template plein écran',
                templateKey: 'debug-fullscreen',
                resolutionX: 1920,
                resolutionY: 1080,
                zones: [{
                    id: 'debug-zone-main',
                    name: 'Main',
                    zoneType: ZoneType.PLAYLIST,
                    orderIndex: 0,
                    positionX: 0,
                    positionY: 0,
                    width: 1920,
                    height: 1080,
                }],
            },
        },
        schedules: [{
            id: 'debug-default-schedule',
            type: ScheduleType.DEFAULT,
            active: true,
            playlistId: 'debug-playlist',
            playlistName: 'Playlist debug',
            startDate: null,
            endDate: null,
            updatedAt: '2026-04-26T09:00:00.000Z',
            slots: ALL_DAYS_OF_WEEK.map((dayOfWeek) => ({
                dayOfWeek,
                startMinutes: 0,
                endMinutes: 24 * 60,
            })),
        }],
        playlists: [{
            playlistId: 'debug-playlist',
            playlistName: 'Playlist debug',
            totalDurationSeconds: 30,
            items: [{
                id: 'debug-sequence-item',
                playlistItemId: 'debug-playlist-item',
                mediaItemId: 'debug-media-item',
                mediaTitle: 'Visuel de debug',
                mediaKind: 'image',
                durationSeconds: 30,
                orderIndex: 0,
                frameIndex: 0,
                asset: {
                    assetId: 'debug-asset',
                    mediaFileId: 'debug-media-file',
                    cacheKey: 'debug-asset',
                    signedUrl: SAMPLE_IMAGE_DATA_URL,
                    expiresAt: '2099-01-01T00:00:00.000Z',
                    mimeType: 'image/svg+xml',
                    width: 1920,
                    height: 1080,
                },
            }],
        }],
    };
}

export const DISPLAY_DEBUG_PRESET_OPTIONS: Array<{
    value: DisplayDebugPreset;
    label: string;
    description: string;
}> = [
    {
        value: 'live',
        label: 'Live',
        description: 'Utilise le comportement réel du player.',
    },
    {
        value: 'pairing',
        label: 'Pairing',
        description: 'Écran non appairé, attente du code OTP.',
    },
    {
        value: 'pending',
        label: 'Pending',
        description: 'Écran appairé en attente de validation.',
    },
    {
        value: 'playing',
        label: 'Playing',
        description: 'Diffusion normale avec média affiché.',
    },
    {
        value: 'syncing',
        label: 'Syncing',
        description: 'Diffusion avec overlay de synchronisation.',
    },
    {
        value: 'degraded',
        label: 'Degraded',
        description: 'Diffusion en mode dégradé hors ligne.',
    },
    {
        value: 'revoked',
        label: 'Revoked',
        description: 'Écran révoqué côté serveur.',
    },
    {
        value: 'error',
        label: 'Error',
        description: 'Erreur bloquante au démarrage du player.',
    },
    {
        value: 'no-active-schedule',
        label: 'No active schedule',
        description: 'Aucune programmation active sur le canal.',
    },
    {
        value: 'no-diffusable-playlist',
        label: 'No diffusable playlist',
        description: 'Playlist vide ou sans média diffusable.',
    },
];

export function isDisplayDebugAvailable() {
    return process.env.NODE_ENV === 'development';
}

export function isDisplayDebugPreset(value: string | null | undefined): value is DisplayDebugPreset {
    return DISPLAY_DEBUG_PRESET_OPTIONS.some((option) => option.value === value);
}

export function loadDisplayDebugPreset() {
    if (!isDisplayDebugAvailable() || typeof window === 'undefined') {
        return 'live' as DisplayDebugPreset;
    }

    const storedPreset = window.localStorage.getItem(DISPLAY_DEBUG_PRESET_STORAGE_KEY);
    if (isDisplayDebugPreset(storedPreset)) {
        return storedPreset;
    }

    return 'live' as DisplayDebugPreset;
}

export function persistDisplayDebugPreset(preset: DisplayDebugPreset) {
    if (!isDisplayDebugAvailable() || typeof window === 'undefined') {
        return;
    }

    if (preset === 'live') {
        window.localStorage.removeItem(DISPLAY_DEBUG_PRESET_STORAGE_KEY);
        return;
    }

    window.localStorage.setItem(DISPLAY_DEBUG_PRESET_STORAGE_KEY, preset);
}

export function getDisplayDebugScenario(preset: DisplayDebugPreset): DisplayDebugScenario | null {
    if (preset === 'live') {
        return null;
    }

    if (preset === 'pairing') {
        return {
            preset,
            label: 'Mode appairage',
            description: 'Affiche l\'état initial avant association de l\'écran.',
            syncStatus: 'PAIRING',
            snapshot: null,
            errorMessage: null,
        };
    }

    if (preset === 'pending') {
        return {
            preset,
            label: 'Mode en attente',
            description: 'Affiche un écran appairé en attente de validation admin.',
            syncStatus: 'PENDING',
            snapshot: null,
            errorMessage: null,
        };
    }

    if (preset === 'revoked') {
        return {
            preset,
            label: 'Mode révoqué',
            description: 'Affiche un écran désactivé côté serveur.',
            syncStatus: 'REVOKED',
            snapshot: null,
            errorMessage: null,
        };
    }

    if (preset === 'error') {
        return {
            preset,
            label: 'Mode erreur',
            description: 'Affiche une erreur bloquante du player.',
            syncStatus: 'ERROR',
            snapshot: null,
            errorMessage: 'Erreur simulée: impossible de récupérer la diffusion.',
        };
    }

    const snapshot = buildBaseSnapshot();

    if (preset === 'syncing') {
        return {
            preset,
            label: 'Mode synchronisation',
            description: 'Affiche la diffusion avec indicateur de synchronisation.',
            syncStatus: 'SYNCING',
            snapshot,
            errorMessage: null,
        };
    }

    if (preset === 'degraded') {
        return {
            preset,
            label: 'Mode dégradé',
            description: 'Affiche la diffusion hors ligne avec cache local.',
            syncStatus: 'DEGRADED',
            snapshot,
            errorMessage: null,
        };
    }

    if (preset === 'no-active-schedule') {
        return {
            preset,
            label: 'Aucune programmation active',
            description: 'Affiche le fallback d\'absence de créneau actif.',
            syncStatus: 'PLAYING',
            snapshot: {
                ...snapshot,
                schedules: [],
            },
            errorMessage: null,
        };
    }

    if (preset === 'no-diffusable-playlist') {
        return {
            preset,
            label: 'Playlist non diffusable',
            description: 'Affiche le diagnostic de playlist vide ou invalide.',
            syncStatus: 'PLAYING',
            snapshot: {
                ...snapshot,
                playlists: [{
                    ...snapshot.playlists[0]!,
                    totalDurationSeconds: 0,
                    items: [],
                }],
            },
            errorMessage: null,
        };
    }

    return {
        preset,
        label: 'Mode lecture',
        description: 'Affiche la diffusion normale avec un visuel simulé.',
        syncStatus: 'PLAYING',
        snapshot,
        errorMessage: null,
    };
}
