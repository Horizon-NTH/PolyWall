import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ChannelsTable } from '@/components/channels/channels-table';
import { setMockPathname } from '@/test/mocks/next-navigation';
import { buildChannelRow } from '@/test/fixtures/builders';

vi.mock('@/actions/channel-actions', () => ({
    deleteChannel: vi.fn(),
}));

describe('ChannelsTable', () => {
    beforeEach(() => {
        setMockPathname('/dashboard/channels');
    });

    const data = [buildChannelRow()];

    it('shows create and management actions for managers', async () => {
        render(<ChannelsTable data={data} canManage />);

        expect(screen.getByRole('link', {name: 'Créer'})).toHaveAttribute('href', '/dashboard/channels/new');

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Ouvrir le menu'}));
        expect(await screen.findByRole('menuitem', {name: 'Modifier infos'})).toBeInTheDocument();
        expect(screen.getByRole('menuitem', {name: 'Supprimer'})).toBeInTheDocument();
    });

    it('hides create and management actions for read-only users', async () => {
        render(<ChannelsTable data={data} canManage={false} />);

        expect(screen.queryByRole('link', {name: 'Créer'})).not.toBeInTheDocument();

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Ouvrir le menu'}));
        expect(await screen.findByRole('menuitem', {name: 'Voir la fiche'})).toBeInTheDocument();
        expect(screen.queryByRole('menuitem', {name: 'Modifier infos'})).not.toBeInTheDocument();
        expect(screen.queryByRole('menuitem', {name: 'Supprimer'})).not.toBeInTheDocument();
    });

    it('shows empty state without create action in read-only mode', () => {
        render(<ChannelsTable data={[]} canManage={false} />);

        expect(screen.getByText('Aucun canal')).toBeInTheDocument();
        expect(screen.queryByRole('link', {name: 'Créer un canal'})).not.toBeInTheDocument();
    });
});
