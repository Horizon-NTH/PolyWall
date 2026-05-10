import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import {
    DisplayTemplatesTable,
    type DisplayTemplateRow,
} from '@/components/display-templates/display-templates-table';

const refreshMock = vi.fn();
const deleteDisplayTemplateMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: refreshMock,
    }),
    usePathname: () => '/dashboard/display-templates',
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));

vi.mock('@/actions/display-template-actions', () => ({
    deleteDisplayTemplate: (...args: unknown[]) => deleteDisplayTemplateMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('DisplayTemplatesTable', () => {
    const rows: DisplayTemplateRow[] = [
        {
            id: 'template-org',
            name: 'Template org',
            description: 'Template de l\'organisation',
            scope: 'organization',
            resolution: '1920x1080',
            zonesCount: 2,
            widgetsCount: 1,
            channelsCount: 0,
            updatedAt: '2026-05-01T10:00:00.000Z',
        },
        {
            id: 'template-global',
            name: 'Template global',
            description: 'Template global',
            scope: 'global',
            resolution: '1920x1080',
            zonesCount: 1,
            widgetsCount: 0,
            channelsCount: 0,
            updatedAt: '2026-05-02T10:00:00.000Z',
        },
    ];

    beforeEach(() => {
        refreshMock.mockReset();
        deleteDisplayTemplateMock.mockReset();
    });

    it('renders rows, create action and management actions for organization templates', async () => {
        render(
            <DisplayTemplatesTable
                data={rows}
                canCreate
                canUpdate
                canDelete
            />,
        );

        expect(screen.getByRole('link', {name: 'Créer'})).toHaveAttribute(
            'href',
            '/dashboard/display-templates/new',
        );
        expect(screen.getByRole('link', {name: 'Template org'})).toHaveAttribute(
            'href',
            '/dashboard/display-templates/template-org?returnTo=%2Fdashboard%2Fdisplay-templates',
        );

        fireEvent.pointerDown(screen.getAllByRole('button', {name: 'Ouvrir le menu'})[0]!);
        expect(await screen.findByRole('menuitem', {name: 'Voir la fiche'})).toBeInTheDocument();
        expect(screen.getByRole('menuitem', {name: 'Modifier'})).toBeInTheDocument();
        expect(screen.getByRole('menuitem', {name: 'Supprimer'})).toBeInTheDocument();
    });

    it('hides global mutation actions unless global management is allowed', async () => {
        render(
            <DisplayTemplatesTable
                data={[rows[1]!]}
                canCreate
                canUpdate
                canDelete
                canManageGlobalTemplates={false}
            />,
        );

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Ouvrir le menu'}));
        expect(await screen.findByRole('menuitem', {name: 'Voir la fiche'})).toBeInTheDocument();
        expect(screen.queryByRole('menuitem', {name: 'Modifier'})).not.toBeInTheDocument();
        expect(screen.queryByRole('menuitem', {name: 'Supprimer'})).not.toBeInTheDocument();
    });

    it('allows deleting a global template when global management is allowed', async () => {
        deleteDisplayTemplateMock.mockResolvedValueOnce({ok: true, templateId: 'template-global'});

        render(
            <DisplayTemplatesTable
                data={[rows[1]!]}
                canCreate
                canUpdate
                canDelete
                canManageGlobalTemplates
            />,
        );

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Ouvrir le menu'}));
        fireEvent.click(await screen.findByRole('menuitem', {name: 'Supprimer'}));
        fireEvent.click(screen.getByRole('button', {name: 'Supprimer'}));

        await waitFor(() => {
            expect(deleteDisplayTemplateMock).toHaveBeenCalledWith('template-global');
            expect(refreshMock).toHaveBeenCalled();
        });
    });

    it('shows empty state without create action in read-only mode', () => {
        render(
            <DisplayTemplatesTable
                data={[]}
                canCreate={false}
                canUpdate={false}
                canDelete={false}
            />,
        );

        expect(screen.getByText('Aucun modèle d\'affichage')).toBeInTheDocument();
        expect(screen.queryByRole('link', {name: 'Créer un modèle'})).not.toBeInTheDocument();
    });
});
