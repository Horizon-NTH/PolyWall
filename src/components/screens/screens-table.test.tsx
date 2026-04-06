import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { ScreensTable } from '@/components/screens/screens-table';
import { ScreenStatus } from '@/generated/prisma/enums';

const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: refreshMock,
    }),
    usePathname: () => '/dashboard/screens',
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));

vi.mock('@/actions/screen-actions', () => ({
    deleteScreen: vi.fn(),
    revokeScreen: vi.fn(),
    reactivateScreen: vi.fn(),
}));

describe('ScreensTable', () => {
    beforeEach(() => {
        refreshMock.mockReset();
    });

    const data = [
        {
            id: 'screen-1',
            name: 'Écran attente',
            location: 'Entrée',
            channelId: null,
            channelName: null,
            status: ScreenStatus.PENDING,
            interactive: false,
            lastSeenAt: null,
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-02T10:00:00.000Z',
        },
        {
            id: 'screen-2',
            name: 'Écran actif',
            location: 'Hall',
            channelId: 'channel-1',
            channelName: 'Hall principal',
            status: ScreenStatus.ACTIVE,
            interactive: true,
            lastSeenAt: '2026-01-02T10:00:00.000Z',
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-02T10:00:00.000Z',
        },
        {
            id: 'screen-3',
            name: 'Écran révoqué',
            location: 'Salle 2',
            channelId: 'channel-1',
            channelName: 'Hall principal',
            status: ScreenStatus.REVOKED,
            interactive: false,
            lastSeenAt: '2026-01-01T09:00:00.000Z',
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-02T10:00:00.000Z',
        },
    ];

    const channels = [{id: 'channel-1', name: 'Hall principal'}];

    it('shows management actions when canManage is true', async () => {
        render(<ScreensTable data={data} canManage channels={channels} />);

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Ouvrir le menu'}));
        expect(await screen.findByRole('menuitem', {name: 'Modifier'})).toBeInTheDocument();
        expect(screen.getByRole('menuitem', {name: 'Supprimer'})).toBeInTheDocument();
    });

    it('hides management actions in read-only mode', async () => {
        render(<ScreensTable data={data} canManage={false} channels={channels} />);

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Ouvrir le menu'}));
        expect(await screen.findByRole('menuitem', {name: 'Voir la fiche'})).toBeInTheDocument();
        expect(screen.queryByRole('menuitem', {name: 'Supprimer'})).not.toBeInTheDocument();
    });

    it('filters rows with tabs', async () => {
        render(<ScreensTable data={data} canManage={false} channels={channels} />);

        expect(screen.getByText('Écran actif')).toBeInTheDocument();
        expect(screen.queryByText('Écran attente')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', {name: /En attente/}));

        expect(await screen.findByText('Écran attente')).toBeInTheDocument();
    });

    it('does not show reset button on initial load and shows pending badge count', () => {
        render(<ScreensTable data={data} canManage={false} channels={channels} />);

        expect(screen.queryByRole('button', {name: 'Réinitialiser'})).not.toBeInTheDocument();
        expect(screen.getByRole('tab', {name: /En attente/})).toHaveTextContent('1');
    });

    it('styles revoked rows as muted', async () => {
        render(<ScreensTable data={data} canManage={false} channels={channels} />);

        fireEvent.click(screen.getByRole('tab', {name: 'Révoqués'}));

        const revokedRow = await screen.findByText('Écran révoqué');
        expect(revokedRow.closest('tr')?.className).toContain('bg-muted/40');
    });

    it('keeps active tab when clicking reset', async () => {
        render(<ScreensTable data={data} canManage={false} channels={channels} />);

        fireEvent.click(screen.getByRole('tab', {name: 'Révoqués'}));
        expect(await screen.findByText('Écran révoqué')).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText('Rechercher un écran...'), {
            target: {value: 'zzz'},
        });
        fireEvent.click(screen.getByRole('button', {name: 'Réinitialiser'}));

        expect(screen.getByRole('tab', {name: 'Révoqués'})).toHaveAttribute('aria-selected', 'true');
        expect(await screen.findByText('Écran révoqué')).toBeInTheDocument();
    });

    it('shows quick approve/delete actions for pending rows', async () => {
        render(<ScreensTable data={data} canManage channels={channels} />);

        fireEvent.click(screen.getByRole('tab', {name: /En attente/}));
        expect(await screen.findByText('Écran attente')).toBeInTheDocument();

        const row = screen.getByText('Écran attente').closest('tr');
        expect(row).not.toBeNull();
        const rowQueries = within(row as HTMLElement);

        expect(rowQueries.getByRole('link', {name: "Valider l'écran"})).toBeInTheDocument();
        expect(rowQueries.getByRole('button', {name: "Supprimer l'écran"})).toBeInTheDocument();
        expect(rowQueries.queryByRole('button', {name: 'Ouvrir le menu'})).not.toBeInTheDocument();
    });
});
