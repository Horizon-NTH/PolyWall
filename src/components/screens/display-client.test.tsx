import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DisplayClient } from '@/components/screens/display-client';
import { DayOfWeek, ScheduleType, ZoneType } from '@/generated/prisma/enums';
import { type DisplayRuntimeSnapshot } from '@/lib/display-runtime/types';

vi.mock('@/components/ui/input-otp', () => ({
    InputOTP: ({
        value,
        onChange,
        children,
        ...props
    }: React.ComponentProps<'div'> & {value?: string; onChange?: (value: string) => void}) => (
        <div {...props}>
            <input
                data-testid="otp-input"
                value={value ?? ''}
                onChange={(event) => onChange?.(event.target.value)}
            />
            {children}
        </div>
    ),
    InputOTPGroup: ({children}: { children: React.ReactNode }) => <div>{children}</div>,
    InputOTPSeparator: () => null,
    InputOTPSlot: () => null,
}));

function buildSnapshot(): DisplayRuntimeSnapshot {
    return {
        revision: 'rev-1',
        serverNow: '2026-04-20T08:00:00.000Z',
        screen: {
            screenId: 'screen-1',
            channelId: 'channel-1',
            interactive: false,
            interactiveUrl: null,
        },
        channel: {
            id: 'channel-1',
            name: 'Hall',
            timezone: 'Europe/Paris',
            template: {
                id: 'template-1',
                name: 'Plein écran',
                templateKey: 'fullscreen',
                resolutionX: 1920,
                resolutionY: 1080,
                zones: [{
                    id: 'zone-1',
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
            id: 'default-1',
            type: ScheduleType.DEFAULT,
            active: true,
            playlistId: 'playlist-1',
            playlistName: 'Playlist',
            startDate: null,
            endDate: null,
            updatedAt: '2026-04-20T07:00:00.000Z',
            slots: [
                DayOfWeek.MONDAY,
                DayOfWeek.TUESDAY,
                DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY,
                DayOfWeek.FRIDAY,
                DayOfWeek.SATURDAY,
                DayOfWeek.SUNDAY,
            ].map((dayOfWeek) => ({
                dayOfWeek,
                startMinutes: 0,
                endMinutes: 1440,
            })),
        }],
        playlists: [{
            playlistId: 'playlist-1',
            playlistName: 'Playlist',
            totalDurationSeconds: 30,
            items: [{
                id: 'item-1',
                playlistItemId: 'playlist-item-1',
                mediaItemId: 'media-1',
                mediaTitle: 'Image principale',
                mediaKind: 'image',
                durationSeconds: 30,
                orderIndex: 0,
                frameIndex: 0,
                asset: {
                    assetId: 'asset-1',
                    mediaFileId: 'asset-1',
                    cacheKey: 'asset-1',
                    signedUrl: 'https://example.com/media.png',
                    expiresAt: '2026-04-20T09:00:00.000Z',
                    mimeType: 'image/png',
                    width: 1280,
                    height: 720,
                },
            }],
        }],
    };
}

function buildTwoItemSnapshot(overrides?: Partial<DisplayRuntimeSnapshot>): DisplayRuntimeSnapshot {
    return {
        ...buildSnapshot(),
        ...overrides,
        playlists: [{
            playlistId: 'playlist-1',
            playlistName: 'Playlist',
            totalDurationSeconds: 60,
            items: [
                {
                    id: 'item-1',
                    playlistItemId: 'playlist-item-1',
                    mediaItemId: 'media-1',
                    mediaTitle: 'Image principale',
                    mediaKind: 'image',
                    durationSeconds: 30,
                    orderIndex: 0,
                    frameIndex: 0,
                    asset: {
                        assetId: 'asset-1',
                        mediaFileId: 'asset-1',
                        cacheKey: 'asset-1',
                        signedUrl: 'https://example.com/media-1.png',
                        expiresAt: '2026-04-20T09:00:00.000Z',
                        mimeType: 'image/png',
                        width: 1280,
                        height: 720,
                    },
                },
                {
                    id: 'item-2',
                    playlistItemId: 'playlist-item-2',
                    mediaItemId: 'media-2',
                    mediaTitle: 'Image secondaire',
                    mediaKind: 'image',
                    durationSeconds: 30,
                    orderIndex: 1,
                    frameIndex: 0,
                    asset: {
                        assetId: 'asset-2',
                        mediaFileId: 'asset-2',
                        cacheKey: 'asset-2',
                        signedUrl: 'https://example.com/media-2.png',
                        expiresAt: '2026-04-20T09:00:00.000Z',
                        mimeType: 'image/png',
                        width: 1280,
                        height: 720,
                    },
                },
            ],
        }],
    };
}

function buildInteractiveSnapshot(screenOverrides?: Partial<DisplayRuntimeSnapshot['screen']>): DisplayRuntimeSnapshot {
    const snapshot = buildSnapshot();

    return {
        ...snapshot,
        screen: {
            ...snapshot.screen,
            interactive: true,
            interactiveUrl: 'https://example.com/interactive',
            ...screenOverrides,
        },
    };
}

function mockActiveState(snapshot: DisplayRuntimeSnapshot) {
    return {
        status: 'ACTIVE',
        screenId: snapshot.screen.screenId,
        channelId: snapshot.screen.channelId,
        interactive: snapshot.screen.interactive,
        interactiveUrl: snapshot.screen.interactiveUrl,
        revision: snapshot.revision,
        serverNow: snapshot.serverNow,
    };
}

describe('DisplayClient', () => {
    beforeEach(() => {
        vi.restoreAllMocks();

        const storage = new Map<string, string>();
        Object.defineProperty(window, 'localStorage', {
            writable: true,
            value: {
                getItem: vi.fn((key: string) => storage.get(key) ?? null),
                setItem: vi.fn((key: string, value: string) => {
                    storage.set(key, value);
                }),
                removeItem: vi.fn((key: string) => {
                    storage.delete(key);
                }),
                clear: vi.fn(() => {
                    storage.clear();
                }),
            },
        });

        Object.defineProperty(window, 'caches', {
            writable: true,
            value: {
                open: vi.fn().mockResolvedValue({
                    match: vi.fn().mockResolvedValue(null),
                    put: vi.fn().mockResolvedValue(undefined),
                    delete: vi.fn().mockResolvedValue(true),
                }),
            },
        });

        Object.defineProperty(URL, 'createObjectURL', {
            writable: true,
            value: vi.fn(() => 'blob:cached'),
        });

        Object.defineProperty(URL, 'revokeObjectURL', {
            writable: true,
            value: vi.fn(),
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('disables submit while OTP is incomplete', async () => {
        const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
            const url = String(input);
            if (url.includes('/api/display/state')) {
                return new Response(JSON.stringify({error: 'Écran introuvable.'}), {status: 404});
            }
            return new Response(JSON.stringify({error: 'Code OTP invalide.'}), {status: 401});
        });

        await act(async () => {
            render(<DisplayClient />);
        });

        await screen.findByText(/Saisissez le code.*6 chiffres/i);
        const button = screen.getByRole('button', {name: 'Valider le code'});
        expect(button).toBeDisabled();

        fireEvent.change(screen.getByTestId('otp-input'), {target: {value: '12345'}});
        expect(button).toBeDisabled();
        expect(fetchMock).toHaveBeenCalled();
    });

    it('restores the cached snapshot and falls back to degraded mode on network failure', async () => {
        window.localStorage.setItem(
            'polywall.display.snapshot.test-device',
            JSON.stringify(buildSnapshot()),
        );
        window.localStorage.setItem('polywall.screen.deviceId', 'test-device');

        vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

        await act(async () => {
            render(<DisplayClient />);
        });

        await waitFor(() => {
            expect(screen.getByText('Mode dégradé')).toBeInTheDocument();
        });
        expect(screen.getByAltText('Image principale')).toBeInTheDocument();
    });

    it('loads runtime snapshot when the server announces a new revision', async () => {
        const runtimeSnapshot = {
            ...buildSnapshot(),
            revision: 'rev-2',
            serverNow: '2026-04-20T08:01:00.000Z',
        };

        const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
            const url = String(input);
            if (url.includes('/api/display/state')) {
                return new Response(JSON.stringify({
                    status: 'ACTIVE',
                    screenId: 'screen-1',
                    channelId: 'channel-1',
                    interactive: false,
                    interactiveUrl: null,
                    revision: 'rev-2',
                    serverNow: '2026-04-20T08:01:00.000Z',
                }), {status: 200});
            }

            if (url.includes('/api/display/runtime')) {
                return new Response(JSON.stringify(runtimeSnapshot), {status: 200});
            }

            return new Response(JSON.stringify({error: 'Unexpected'}), {status: 500});
        });

        await act(async () => {
            render(<DisplayClient />);
        });

        expect(await screen.findByAltText('Image principale')).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/api/display/runtime?deviceId='),
            expect.objectContaining({cache: 'no-store'}),
        );
    });

    it('re-synchronizes playback from display state even when the snapshot revision is unchanged', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-20T08:00:00.000Z').getTime());

        window.localStorage.setItem(
            'polywall.display.snapshot.test-device',
            JSON.stringify(buildTwoItemSnapshot({
                revision: 'rev-1',
                serverNow: '2026-04-20T08:00:00.000Z',
            })),
        );
        window.localStorage.setItem('polywall.screen.deviceId', 'test-device');

        const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
            const url = String(input);
            if (url.includes('/api/display/state')) {
                return new Response(JSON.stringify({
                    status: 'ACTIVE',
                    screenId: 'screen-1',
                    channelId: 'channel-1',
                    interactive: false,
                    interactiveUrl: null,
                    revision: 'rev-1',
                    serverNow: '2026-04-20T08:00:45.000Z',
                }), {status: 200});
            }

            return new Response(JSON.stringify({error: 'Unexpected runtime call'}), {status: 500});
        });

        await act(async () => {
            render(<DisplayClient />);
        });

        await waitFor(() => {
            expect(screen.getByAltText('Image secondaire')).toBeInTheDocument();
        });

        expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/api/display/runtime'))).toBe(false);
    });

    it('does not open an interactive iframe when the screen is not interactive', async () => {
        const snapshot = buildSnapshot();
        window.localStorage.setItem(
            'polywall.display.snapshot.test-device',
            JSON.stringify(snapshot),
        );
        window.localStorage.setItem('polywall.screen.deviceId', 'test-device');

        vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
            const url = String(input);
            if (url.includes('/api/display/state')) {
                return new Response(JSON.stringify(mockActiveState(snapshot)), {status: 200});
            }

            return new Response(JSON.stringify({error: 'Unexpected runtime call'}), {status: 500});
        });

        await act(async () => {
            render(<DisplayClient />);
        });

        const image = await screen.findByAltText('Image principale');
        fireEvent.pointerDown(image);

        expect(screen.queryByTitle('Site interactif')).not.toBeInTheDocument();
    });

    it('opens an interactive iframe when an interactive screen is touched', async () => {
        const snapshot = buildInteractiveSnapshot();
        window.localStorage.setItem(
            'polywall.display.snapshot.test-device',
            JSON.stringify(snapshot),
        );
        window.localStorage.setItem('polywall.screen.deviceId', 'test-device');

        vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
            const url = String(input);
            if (url.includes('/api/display/state')) {
                return new Response(JSON.stringify(mockActiveState(snapshot)), {status: 200});
            }

            return new Response(JSON.stringify({error: 'Unexpected runtime call'}), {status: 500});
        });

        await act(async () => {
            render(<DisplayClient />);
        });

        const image = await screen.findByAltText('Image principale');
        fireEvent.pointerDown(image);

        const iframe = await screen.findByTitle('Site interactif');
        expect(iframe).toHaveAttribute('src', 'https://example.com/interactive');
        expect(iframe).toHaveAttribute('referrerpolicy', 'no-referrer');
        expect(iframe).toHaveAttribute('sandbox');
    });

    it('closes the interactive iframe when the close button is pressed', async () => {
        const snapshot = buildInteractiveSnapshot();
        window.localStorage.setItem(
            'polywall.display.snapshot.test-device',
            JSON.stringify(snapshot),
        );
        window.localStorage.setItem('polywall.screen.deviceId', 'test-device');

        vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
            const url = String(input);
            if (url.includes('/api/display/state')) {
                return new Response(JSON.stringify(mockActiveState(snapshot)), {status: 200});
            }

            return new Response(JSON.stringify({error: 'Unexpected runtime call'}), {status: 500});
        });

        await act(async () => {
            render(<DisplayClient />);
        });

        const image = await screen.findByAltText('Image principale');
        fireEvent.pointerDown(image);
        expect(await screen.findByTitle('Site interactif')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Fermer le site interactif'}));

        expect(screen.queryByTitle('Site interactif')).not.toBeInTheDocument();
        expect(screen.getByAltText('Image principale')).toBeInTheDocument();
    });

    it('closes the interactive iframe when the runtime snapshot becomes non-interactive', async () => {
        const interactiveSnapshot = buildInteractiveSnapshot();
        const nonInteractiveSnapshot = {
            ...buildSnapshot(),
            revision: 'rev-2',
            serverNow: '2026-04-20T08:01:00.000Z',
        };
        let currentSnapshot = interactiveSnapshot;

        window.localStorage.setItem(
            'polywall.display.snapshot.test-device',
            JSON.stringify(interactiveSnapshot),
        );
        window.localStorage.setItem('polywall.screen.deviceId', 'test-device');

        vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
            const url = String(input);
            if (url.includes('/api/display/state')) {
                return new Response(JSON.stringify(mockActiveState(currentSnapshot)), {status: 200});
            }

            if (url.includes('/api/display/runtime')) {
                return new Response(JSON.stringify(currentSnapshot), {status: 200});
            }

            return new Response(JSON.stringify({error: 'Unexpected'}), {status: 500});
        });

        await act(async () => {
            render(<DisplayClient />);
        });

        const image = await screen.findByAltText('Image principale');
        fireEvent.pointerDown(image);
        expect(await screen.findByTitle('Site interactif')).toBeInTheDocument();

        currentSnapshot = nonInteractiveSnapshot;
        act(() => {
            window.dispatchEvent(new Event('online'));
        });

        await waitFor(() => {
            expect(screen.queryByTitle('Site interactif')).not.toBeInTheDocument();
        });
    });
});
