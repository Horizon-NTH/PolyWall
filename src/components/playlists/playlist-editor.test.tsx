import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import {
    PlaylistEditor,
    type AvailableMediaItem,
    type TimelineMediaItem,
} from '@/components/playlists/playlist-editor';
import { TooltipProvider } from '@/components/ui/tooltip';
import { routerMock, setMockPathname } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';

const replacePlaylistTimelineMock = vi.fn();
const toggleMediaItemActiveMock = vi.fn();

vi.mock('@/actions/playlist-actions', () => ({
    replacePlaylistTimeline: (...args: unknown[]) => replacePlaylistTimelineMock(...args),
}));

vi.mock('@/actions/media-actions', () => ({
    toggleMediaItemActive: (...args: unknown[]) => toggleMediaItemActiveMock(...args),
}));

vi.mock('@dnd-kit/core', () => ({
    DndContext: ({children}: { children: React.ReactNode }) => <div>{children}</div>,
    DragOverlay: ({children}: { children: React.ReactNode }) => <div>{children}</div>,
    PointerSensor: class {
    },
    useDraggable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: vi.fn(),
        isDragging: false,
    }),
    useDroppable: () => ({
        setNodeRef: vi.fn(),
        isOver: false,
    }),
    useSensor: () => ({}),
    useSensors: (...sensors: unknown[]) => sensors,
}));

vi.mock('@dnd-kit/sortable', () => ({
    SortableContext: ({children}: { children: React.ReactNode }) => <div>{children}</div>,
    arrayMove: <T, >(array: T[], from: number, to: number) => {
        const next = [...array];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
    },
    useSortable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: vi.fn(),
        transform: null,
        transition: null,
        isDragging: false,
    }),
    verticalListSortingStrategy: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
    CSS: {
        Translate: {
            toString: () => '',
        },
    },
}));

const availableMedia: AvailableMediaItem[] = [
    {
        id: 'media-1',
        title: 'Hall accueil',
        description: 'Affiche principale',
        durationSeconds: 30,
        thumbUrl: null,
    },
    {
        id: 'media-2',
        title: 'Menus cafétéria',
        description: 'Mise à jour midi',
        durationSeconds: 45,
        thumbUrl: null,
    },
];

const timeline: TimelineMediaItem[] = [
    {
        entryId: 'entry-1',
        mediaItemId: 'media-1',
        title: 'Hall accueil',
        description: 'Affiche principale',
        durationSeconds: 30,
        thumbUrl: null,
        active: true,
    },
    {
        entryId: 'entry-2',
        mediaItemId: 'media-2',
        title: 'Menus cafétéria',
        description: 'Mise à jour midi',
        durationSeconds: 45,
        thumbUrl: null,
        active: false,
    },
];

describe('PlaylistEditor', () => {
    function renderEditor() {
        return render(
            <TooltipProvider>
                <PlaylistEditor
                    playlistId="playlist-1"
                    availableMedia={availableMedia}
                    initialTimeline={timeline}
                />
            </TooltipProvider>,
        );
    }

    beforeEach(() => {
        setMockPathname('/dashboard/playlists/playlist-1');
        replacePlaylistTimelineMock.mockReset();
        toggleMediaItemActiveMock.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('filters available media and clears query', () => {
        renderEditor();

        fireEvent.change(screen.getByPlaceholderText('Rechercher un média actif...'), {
            target: {value: 'inexistant'},
        });

        expect(screen.getByText('Aucun média actif trouvé.')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Effacer la recherche'}));

        expect(screen.queryByText('Aucun média actif trouvé.')).not.toBeInTheDocument();
    });

    it('reorders timeline items and persists changes', async () => {
        replacePlaylistTimelineMock.mockResolvedValueOnce({ok: true});
        vi.useFakeTimers();

        renderEditor();

        fireEvent.click(screen.getAllByRole('button', {name: 'Descendre'})[0]);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1300);
        });

        expect(replacePlaylistTimelineMock).toHaveBeenCalledWith('playlist-1', {
            items: [{mediaItemId: 'media-2'}, {mediaItemId: 'media-1'}],
        });
    });

    it('reactivates an inactive media and refreshes page', async () => {
        toggleMediaItemActiveMock.mockResolvedValueOnce({ok: true});

        renderEditor();

        fireEvent.click(screen.getByRole('button', {name: 'Réactiver le média'}));

        await waitFor(() => {
            expect(toggleMediaItemActiveMock).toHaveBeenCalledWith('media-2');
            expect(toastMock.success).toHaveBeenCalledWith('Média activé.');
            expect(routerMock.refresh).toHaveBeenCalled();
        });
    });

    it('shows save error and retries successfully', async () => {
        vi.useFakeTimers();
        replacePlaylistTimelineMock
            .mockResolvedValueOnce({ok: false, message: 'Sauvegarde impossible.'})
            .mockResolvedValueOnce({ok: true});

        renderEditor();

        fireEvent.click(screen.getAllByRole('button', {name: 'Retirer'})[0]);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1300);
        });

        expect(toastMock.error).toHaveBeenCalledWith('Sauvegarde impossible.');
        expect(screen.getByText('Erreur de sauvegarde')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Réessayer'}));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(400);
        });

        expect(replacePlaylistTimelineMock).toHaveBeenNthCalledWith(2, 'playlist-1', {
            items: [{mediaItemId: 'media-2'}],
        });
    });
});
