import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ScreenStatus } from '@/generated/prisma/enums';
import { ScreenActionsCard } from '@/components/screens/screen-actions-card';

const refreshMock = vi.fn();
const replaceMock = vi.fn();
const deleteScreenMock = vi.fn();
const revokeScreenMock = vi.fn();
const reactivateScreenMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: refreshMock,
        replace: replaceMock,
    }),
}));

vi.mock('@/actions/screen-actions', () => ({
    deleteScreen: (...args: unknown[]) => deleteScreenMock(...args),
    revokeScreen: (...args: unknown[]) => revokeScreenMock(...args),
    reactivateScreen: (...args: unknown[]) => reactivateScreenMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
        error: (...args: unknown[]) => toastErrorMock(...args),
    },
}));

vi.mock('@/components/ui/select', () => ({
    Select: ({children, value, onValueChange}: {
        children: ReactNode;
        value?: string;
        onValueChange?: (value: string) => void;
    }) => (
        <select
            aria-label="Canal de réactivation"
            value={value}
            onChange={(event) => onValueChange?.(event.target.value)}
        >
            {children}
        </select>
    ),
    SelectTrigger: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectValue: ({placeholder}: { placeholder?: string }) => <option value="">{placeholder}</option>,
    SelectContent: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({value, children}: { value: string; children: ReactNode }) => (
        <option value={value}>{children}</option>
    ),
}));

describe('ScreenActionsCard', () => {
    const channels = [
        {id: 'channel-1', name: 'Accueil'},
        {id: 'channel-2', name: 'Hall'},
    ];

    beforeEach(() => {
        refreshMock.mockReset();
        replaceMock.mockReset();
        deleteScreenMock.mockReset();
        revokeScreenMock.mockReset();
        reactivateScreenMock.mockReset();
        toastSuccessMock.mockReset();
        toastErrorMock.mockReset();
    });

    it('revokes an active screen and refreshes on success', async () => {
        revokeScreenMock.mockResolvedValueOnce({ok: true});

        render(
            <ScreenActionsCard
                screenId="screen-1"
                screenName="Écran accueil"
                status={ScreenStatus.ACTIVE}
                channels={channels}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Révoquer'}));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Révoquer'}));

        await waitFor(() => {
            expect(revokeScreenMock).toHaveBeenCalledWith('screen-1');
            expect(toastSuccessMock).toHaveBeenCalledWith('Écran révoqué.');
            expect(refreshMock).toHaveBeenCalled();
        });
    });

    it('requires a channel to reactivate a revoked screen', async () => {
        reactivateScreenMock.mockResolvedValueOnce({ok: true});

        render(
            <ScreenActionsCard
                screenId="screen-2"
                screenName="Écran borne"
                status={ScreenStatus.REVOKED}
                channels={channels}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Réactiver'}));
        const dialog = await screen.findByRole('alertdialog');

        const confirmButton = within(dialog).getByRole('button', {name: 'Réactiver'});
        expect(confirmButton).toBeDisabled();

        fireEvent.change(screen.getByLabelText('Canal de réactivation'), {target: {value: 'channel-2'}});
        expect(confirmButton).not.toBeDisabled();

        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(reactivateScreenMock).toHaveBeenCalledWith('screen-2', {channelId: 'channel-2'});
            expect(toastSuccessMock).toHaveBeenCalledWith('Écran réactivé.');
            expect(refreshMock).toHaveBeenCalled();
        });
    });

    it('deletes a screen and redirects to the list on success', async () => {
        deleteScreenMock.mockResolvedValueOnce({ok: true});

        render(
            <ScreenActionsCard
                screenId="screen-3"
                screenName="Écran secondaire"
                status={ScreenStatus.ACTIVE}
                channels={channels}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Supprimer'}));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));

        await waitFor(() => {
            expect(deleteScreenMock).toHaveBeenCalledWith('screen-3');
            expect(toastSuccessMock).toHaveBeenCalledWith('Écran supprimé.');
            expect(replaceMock).toHaveBeenCalledWith('/dashboard/screens');
        });
    });
});
