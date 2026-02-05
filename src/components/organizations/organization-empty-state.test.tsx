import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';

const organizationSelectMock = vi.fn();

vi.mock('@/components/organizations/organization-select', () => ({
    OrganizationSelect: (props: { organizations: Array<{ id: string; name: string }> }) => {
        organizationSelectMock(props);
        return <div data-testid="organization-select" />;
    },
}));

describe('OrganizationEmptyState', () => {
    it('renders default copy and select', () => {
        render(
            <OrganizationEmptyState
                organizations={[{id: 'org-1', name: 'Org One'}]}
            />,
        );

        expect(screen.getByText('Aucune organisation rattachée')).toBeInTheDocument();
        expect(
            screen.getByText('Sélectionnez une organisation pour accéder à cette page.'),
        ).toBeInTheDocument();
        expect(screen.getByTestId('organization-select')).toBeInTheDocument();
        expect(organizationSelectMock).toHaveBeenCalledWith({
            organizations: [{id: 'org-1', name: 'Org One'}],
        });
    });

    it('renders custom title and description', () => {
        render(
            <OrganizationEmptyState
                organizations={[]}
                title="Titre personnalisé"
                description="Description personnalisée."
            />,
        );

        expect(screen.getByText('Titre personnalisé')).toBeInTheDocument();
        expect(screen.getByText('Description personnalisée.')).toBeInTheDocument();
    });
});
