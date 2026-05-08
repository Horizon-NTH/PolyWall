import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { DisplayTemplateDeleteDialog } from '@/components/display-templates/display-template-delete-dialog';

describe('DisplayTemplateDeleteDialog', () => {
    it('confirms deletion when the template is unused', () => {
        const onConfirm = vi.fn();

        render(
            <DisplayTemplateDeleteDialog
                open={true}
                channelsCount={0}
                onConfirm={onConfirm}
                title="Supprimer Modèle Hall ?"
            />,
        );

        const dialog = screen.getByRole('alertdialog');
        expect(within(dialog).getByText('Supprimer Modèle Hall ?')).toBeInTheDocument();
        expect(within(dialog).getByText(/Cette action est définitive/)).toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('blocks deletion when channels still use the template', () => {
        const onConfirm = vi.fn();

        render(
            <DisplayTemplateDeleteDialog
                open={true}
                channelsCount={2}
                onConfirm={onConfirm}
                title="Supprimer Modèle Hall ?"
            />,
        );

        const dialog = screen.getByRole('alertdialog');
        expect(within(dialog).getByText(/Suppression bloquée/)).toBeInTheDocument();
        expect(within(dialog).queryByRole('button', {name: 'Supprimer'})).not.toBeInTheDocument();
    });
});
