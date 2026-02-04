import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { OrganizationOverview } from '@/components/organizations/organization-overview';
import { formatDate } from '@/lib/utils';

describe('OrganizationOverview', () => {
    it('renders organization details and counts', () => {
        const createdAt = new Date('2024-01-10T10:00:00.000Z');
        const updatedAt = new Date('2024-02-18T12:00:00.000Z');

        render(
            <OrganizationOverview
                organization={{
                    id: 'org-1',
                    name: 'Org One',
                    description: 'Description de l\'organisation.',
                    createdAt,
                    updatedAt,
                    _count: {
                        users: 12,
                        screens: 3,
                        channels: 5,
                        playlists: 9,
                    },
                }}
            />,
        );

        expect(screen.getByText('Org One')).toBeInTheDocument();
        expect(
            screen.getByText(`Dernière mise à jour le ${formatDate(updatedAt)}`),
        ).toBeInTheDocument();
        expect(screen.getByText('Description de l\'organisation.')).toBeInTheDocument();
        expect(screen.getByText(formatDate(createdAt))).toBeInTheDocument();
        expect(screen.getByText('org-1')).toBeInTheDocument();

        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('9')).toBeInTheDocument();
    });
});
