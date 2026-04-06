import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { MediaCard } from '@/components/media/media-card';

const onToggleMock = vi.fn();
const onDeleteMock = vi.fn();

vi.mock('next/navigation', () => ({
    usePathname: () => '/dashboard/media',
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));

describe('MediaCard', () => {
    beforeEach(() => {
        onToggleMock.mockReset();
        onDeleteMock.mockReset();
    });

    const baseItem = {
        id: 'media-1',
        title: 'Affiche Hall',
        description: 'Visuel principal',
        active: true,
        updatedAt: '2026-02-01T10:00:00.000Z',
        kind: 'image' as const,
        status: 'READY' as const,
        thumbUrl: null,
        sizeBytes: 1024,
    };

    it('renders media metadata and links', () => {
        render(
            <MediaCard
                item={baseItem}
                statusLabel="Prêt"
                kindLabel="Image"
                onToggle={onToggleMock}
                onDelete={onDeleteMock}
                isPending={false}
            />,
        );

        expect(screen.getByText('Affiche Hall')).toBeInTheDocument();
        expect(screen.getByText('Visuel principal')).toBeInTheDocument();
        expect(screen.getByText('Actif')).toBeInTheDocument();
        expect(screen.getByText('Prêt')).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Ouvrir'})).toHaveAttribute(
            'href',
            '/dashboard/media/media-1?returnTo=%2Fdashboard%2Fmedia',
        );
        expect(screen.getByText('Image')).toBeInTheDocument();
    });

    it('renders thumbnail image when provided', () => {
        render(
            <MediaCard
                item={{...baseItem, thumbUrl: 'https://cdn.example.com/thumb.jpg'}}
                statusLabel="Prêt"
                kindLabel="Image"
                onToggle={onToggleMock}
                onDelete={onDeleteMock}
                isPending={false}
            />,
        );

        expect(screen.getByRole('img', {name: 'Aperçu Affiche Hall'})).toHaveAttribute(
            'src',
            'https://cdn.example.com/thumb.jpg',
        );
    });

    it('calls toggle and delete callbacks from dropdown actions', async () => {
        render(
            <MediaCard
                item={baseItem}
                statusLabel="Prêt"
                kindLabel="Image"
                onToggle={onToggleMock}
                onDelete={onDeleteMock}
                isPending={false}
            />,
        );

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Ouvrir le menu'}), {button: 0});
        fireEvent.click(await screen.findByText('Désactiver'));
        expect(onToggleMock).toHaveBeenCalledTimes(1);

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Ouvrir le menu'}), {button: 0});
        fireEvent.click(await screen.findByText('Supprimer'));
        expect(onDeleteMock).toHaveBeenCalledTimes(1);
    });

    it('shows inactive state and activate action', async () => {
        render(
            <MediaCard
                item={{...baseItem, active: false}}
                statusLabel="Prêt"
                kindLabel="Image"
                onToggle={onToggleMock}
                onDelete={onDeleteMock}
                isPending={false}
            />,
        );

        const card = screen.getByText('Affiche Hall').closest('[data-slot="card"]');
        expect(card).not.toBeNull();
        expect(within(card as HTMLElement).getByText('Inactif')).toBeInTheDocument();

        fireEvent.pointerDown(within(card as HTMLElement).getByRole('button', {name: 'Ouvrir le menu'}), {
            button: 0,
        });
        expect(await screen.findByText('Activer')).toBeInTheDocument();
    });
});
