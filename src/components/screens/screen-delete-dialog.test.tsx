import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { ScreenDeleteDialog } from '@/components/screens/screen-delete-dialog';

describe('ScreenDeleteDialog', () => {
    it('renders and confirms screen deletion', () => {
        const onConfirm = vi.fn();

        render(
            <ScreenDeleteDialog
                open={true}
                onConfirm={onConfirm}
                title="Supprimer Écran Hall ?"
            />,
        );

        const dialog = screen.getByRole('alertdialog');
        expect(within(dialog).getByText('Supprimer Écran Hall ?')).toBeInTheDocument();
        expect(within(dialog).getByText('Cette action est définitive.')).toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });
});
