import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AccountPasswordForm } from '@/components/account/account-password-form';

const changePasswordMock = vi.fn();

vi.mock('@/actions/account-actions', () => ({
    changePassword: (...args: unknown[]) => changePasswordMock(...args),
}));

describe('AccountPasswordForm', () => {
    beforeEach(() => {
        changePasswordMock.mockReset();
    });

    it('shows validation error when confirmation does not match', async () => {
        render(<AccountPasswordForm />);

        fireEvent.change(screen.getByLabelText('Mot de passe actuel'), {
            target: {value: 'CurrentPass123!'},
        });
        fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), {
            target: {value: 'NewPassword123!'},
        });
        fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), {
            target: {value: 'Mismatch123!'},
        });
        fireEvent.click(screen.getByRole('button', {name: 'Mettre à jour'}));

        await waitFor(() => {
            expect(
                screen.getByText('Les mots de passe ne correspondent pas.'),
            ).toBeInTheDocument();
        });
    });

    it('shows server error when current password is incorrect', async () => {
        changePasswordMock.mockResolvedValueOnce({
            ok: false,
            field: 'currentPassword',
            message: 'Mot de passe actuel incorrect.',
        });

        render(<AccountPasswordForm />);

        fireEvent.change(screen.getByLabelText('Mot de passe actuel'), {
            target: {value: 'CurrentPass123!'},
        });
        fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), {
            target: {value: 'NewPassword123!'},
        });
        fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), {
            target: {value: 'NewPassword123!'},
        });
        fireEvent.click(screen.getByRole('button', {name: 'Mettre à jour'}));

        await waitFor(() => {
            expect(
                screen.getByText('Mot de passe actuel incorrect.'),
            ).toBeInTheDocument();
        });
    });

    it('shows success message and clears fields on success', async () => {
        changePasswordMock.mockResolvedValueOnce({ok: true});

        render(<AccountPasswordForm />);

        const currentInput = screen.getByLabelText('Mot de passe actuel') as HTMLInputElement;
        const newInput = screen.getByLabelText('Nouveau mot de passe') as HTMLInputElement;
        const confirmInput = screen.getByLabelText('Confirmer le mot de passe') as HTMLInputElement;

        fireEvent.change(currentInput, {
            target: {value: 'CurrentPass123!'},
        });
        fireEvent.change(newInput, {
            target: {value: 'NewPassword123!'},
        });
        fireEvent.change(confirmInput, {
            target: {value: 'NewPassword123!'},
        });
        fireEvent.click(screen.getByRole('button', {name: 'Mettre à jour'}));

        await waitFor(() => {
            expect(screen.getByText('Mot de passe mis à jour.')).toBeInTheDocument();
        });

        expect(currentInput.value).toBe('');
        expect(newInput.value).toBe('');
        expect(confirmInput.value).toBe('');
    });
});
