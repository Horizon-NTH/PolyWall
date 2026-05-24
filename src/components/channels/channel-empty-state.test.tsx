import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ChannelEmptyState } from '@/components/channels/channel-empty-state';

describe('ChannelEmptyState', () => {
    it('renders default content and create link', () => {
        render(<ChannelEmptyState />);

        expect(screen.getByText('Aucun canal')).toBeInTheDocument();
        expect(
            screen.getByText('Créez un canal pour organiser vos diffusions et associer vos écrans.'),
        ).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Créer un canal'})).toHaveAttribute(
            'href',
            '/dashboard/channels/new',
        );
    });

    it('supports custom create href', () => {
        render(<ChannelEmptyState createHref="/dashboard/channels/new?source=test" />);

        expect(screen.getByRole('link', {name: 'Créer un canal'})).toHaveAttribute(
            'href',
            '/dashboard/channels/new?source=test',
        );
    });

    it('hides create action in read-only mode', () => {
        render(<ChannelEmptyState canCreate={false} />);

        expect(screen.queryByRole('link', {name: 'Créer un canal'})).not.toBeInTheDocument();
    });
});
