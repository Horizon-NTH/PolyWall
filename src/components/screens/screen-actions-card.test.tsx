import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ScreenStatus } from '@/generated/prisma/enums';
import { ScreenActionsCard } from '@/components/screens/screen-actions-card';
import { routerMock } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';

const deleteScreenMock = vi.fn();
const revokeScreenMock = vi.fn();
const reactivateScreenMock = vi.fn();

vi.mock('@/actions/screen-actions', () => ({
    deleteScreen: (...args: unknown[]) => deleteScreenMock(...args),
    revokeScreen: (...args: unknown[]) => revokeScreenMock(...args),
    reactivateScreen: (...args: unknown[]) => reactivateScreenMock(...args),
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
        deleteScreenMock.mockReset();
        revokeScreenMock.mockReset();
        reactivateScreenMock.mockReset();
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
            expect(toastMock.success).toHaveBeenCalledWith('Écran révoqué.');
            expect(routerMock.refresh).toHaveBeenCalled();
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
            expect(toastMock.success).toHaveBeenCalledWith('Écran réactivé.');
            expect(routerMock.refresh).toHaveBeenCalled();
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
            expect(toastMock.success).toHaveBeenCalledWith('Écran supprimé.');
            expect(routerMock.replace).toHaveBeenCalledWith('/dashboard/screens');
        });
    });
});
