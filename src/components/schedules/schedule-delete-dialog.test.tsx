import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { ScheduleDeleteDialog } from '@/components/schedules/schedule-delete-dialog';

describe('ScheduleDeleteDialog', () => {
    it('renders custom copy and confirms deletion', () => {
        const onConfirm = vi.fn();

        render(
            <ScheduleDeleteDialog
                open={true}
                onConfirm={onConfirm}
                title="Supprimer Programmation Actus ?"
                description="Cette suppression est définitive."
            />,
        );

        const dialog = screen.getByRole('alertdialog');
        expect(within(dialog).getByText('Supprimer Programmation Actus ?')).toBeInTheDocument();
        expect(within(dialog).getByText('Cette suppression est définitive.')).toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });
});
