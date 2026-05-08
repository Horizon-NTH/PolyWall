import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { DisplayTemplateActionsCard } from '@/components/display-templates/display-template-actions-card';

const pushMock = vi.fn();
const replaceMock = vi.fn();
const duplicateDisplayTemplateMock = vi.fn();
const deleteDisplayTemplateMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: pushMock,
        replace: replaceMock,
    }),
}));

vi.mock('@/actions/display-template-actions', () => ({
    duplicateDisplayTemplate: (...args: unknown[]) => duplicateDisplayTemplateMock(...args),
    deleteDisplayTemplate: (...args: unknown[]) => deleteDisplayTemplateMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
        error: (...args: unknown[]) => toastErrorMock(...args),
    },
}));

describe('DisplayTemplateActionsCard', () => {
    beforeEach(() => {
        pushMock.mockReset();
        replaceMock.mockReset();
        duplicateDisplayTemplateMock.mockReset();
        deleteDisplayTemplateMock.mockReset();
        toastSuccessMock.mockReset();
        toastErrorMock.mockReset();
    });

    it('duplicates the template', async () => {
        duplicateDisplayTemplateMock.mockResolvedValueOnce({ok: true, templateId: 'template-copy'});

        render(
            <DisplayTemplateActionsCard
                templateId="template-1"
                templateName="Modèle Hall"
                channelsCount={0}
                canDuplicate={true}
                canDelete={true}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Dupliquer'}));

        await waitFor(() => {
            expect(duplicateDisplayTemplateMock).toHaveBeenCalledWith('template-1', {
                name: 'Modèle Hall - copie',
            });
            expect(toastSuccessMock).toHaveBeenCalledWith('Modèle dupliqué.');
            expect(pushMock).toHaveBeenCalledWith('/dashboard/display-templates/template-copy');
        });
    });

    it('opens a confirmation dialog before deleting', async () => {
        deleteDisplayTemplateMock.mockResolvedValueOnce({ok: true, templateId: 'template-1'});

        render(
            <DisplayTemplateActionsCard
                templateId="template-1"
                templateName="Modèle Hall"
                channelsCount={0}
                canDuplicate={false}
                canDelete={true}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Supprimer'}));
        expect(deleteDisplayTemplateMock).not.toHaveBeenCalled();

        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));

        await waitFor(() => {
            expect(deleteDisplayTemplateMock).toHaveBeenCalledWith('template-1');
            expect(toastSuccessMock).toHaveBeenCalledWith('Modèle supprimé.');
            expect(replaceMock).toHaveBeenCalledWith('/dashboard/display-templates');
        });
    });

    it('shows blocked deletion dialog when channels still use the template', async () => {
        render(
            <DisplayTemplateActionsCard
                templateId="template-1"
                templateName="Modèle Hall"
                channelsCount={1}
                canDuplicate={false}
                canDelete={true}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Supprimer'}));
        const dialog = await screen.findByRole('alertdialog');

        expect(within(dialog).getByText(/Suppression bloquée/)).toBeInTheDocument();
        expect(within(dialog).queryByRole('button', {name: 'Supprimer'})).not.toBeInTheDocument();
        expect(deleteDisplayTemplateMock).not.toHaveBeenCalled();
    });
});
