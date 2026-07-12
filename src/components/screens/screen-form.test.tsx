import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ScreenForm } from '@/components/screens/screen-form';
import { routerMock } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';

const approvePendingScreenMock = vi.fn();
const updateScreenMock = vi.fn();

vi.mock('@/actions/screen-actions', () => ({
    approvePendingScreen: (...args: unknown[]) => approvePendingScreenMock(...args),
    updateScreen: (...args: unknown[]) => updateScreenMock(...args),
}));

vi.mock('@/components/ui/select', () => ({
    Select: ({children, value, onValueChange}: {
        children: ReactNode;
        value?: string;
        onValueChange?: (value: string) => void;
    }) => (
        <select
            aria-label="Canal"
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

vi.mock('@/components/ui/checkbox', () => ({
    Checkbox: ({id, checked, onCheckedChange}: {
        id?: string;
        checked?: boolean;
        onCheckedChange?: (value: boolean) => void;
    }) => (
        <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(event) => onCheckedChange?.(event.target.checked)}
        />
    ),
}));

describe('ScreenForm', () => {
    const channels = [
        {id: 'channel-1', name: 'Accueil'},
        {id: 'channel-2', name: 'Hall'},
    ];

    beforeEach(() => {
        approvePendingScreenMock.mockReset();
        updateScreenMock.mockReset();
    });

    it('approves a pending screen and redirects on success', async () => {
        approvePendingScreenMock.mockResolvedValueOnce({ok: true, screenId: 'screen-1'});

        render(
            <ScreenForm
                mode="approve"
                screenId="screen-1"
                channels={channels}
                cancelHref="/dashboard/screens/screen-1"
            />,
        );

        fireEvent.change(screen.getByLabelText('Nom'), {target: {value: 'Écran accueil'}});
        fireEvent.change(screen.getByLabelText('Localisation'), {target: {value: 'Hall principal'}});
        fireEvent.change(screen.getByLabelText('Canal'), {target: {value: 'channel-1'}});
        fireEvent.click(screen.getByRole('button', {name: 'Valider'}));

        await waitFor(() => {
            expect(approvePendingScreenMock).toHaveBeenCalledWith('screen-1', {
                name: 'Écran accueil',
                location: 'Hall principal',
                channelId: 'channel-1',
                interactive: false,
                interactiveUrl: '',
            });
            expect(toastMock.success).toHaveBeenCalledWith('Écran validé.');
            expect(routerMock.push).toHaveBeenCalledWith('/dashboard/screens/screen-1');
        });
    });

    it('updates a screen and redirects on success', async () => {
        updateScreenMock.mockResolvedValueOnce({ok: true, screenId: 'screen-2'});

        render(
            <ScreenForm
                mode="edit"
                screenId="screen-2"
                channels={channels}
                cancelHref="/dashboard/screens/screen-2"
                defaultValues={{
                    name: 'Écran salle 1',
                    location: 'Salle 1',
                    channelId: 'channel-1',
                    interactive: false,
                }}
            />,
        );

        fireEvent.change(screen.getByLabelText('Nom'), {target: {value: 'Écran salle 2'}});
        fireEvent.change(screen.getByLabelText('Canal'), {target: {value: 'channel-2'}});
        fireEvent.click(screen.getByRole('button', {name: 'Enregistrer'}));

        await waitFor(() => {
            expect(updateScreenMock).toHaveBeenCalledWith('screen-2', {
                name: 'Écran salle 2',
                location: 'Salle 1',
                channelId: 'channel-2',
                interactive: false,
                interactiveUrl: '',
            });
            expect(toastMock.success).toHaveBeenCalledWith('Écran mis à jour.');
            expect(routerMock.push).toHaveBeenCalledWith('/dashboard/screens/screen-2');
        });
    });

    it('clears interactive fields when interactive mode is disabled', async () => {
        updateScreenMock.mockResolvedValueOnce({ok: true, screenId: 'screen-3'});

        render(
            <ScreenForm
                mode="edit"
                screenId="screen-3"
                channels={channels}
                cancelHref="/dashboard/screens/screen-3"
                defaultValues={{
                    name: 'Écran borne',
                    location: 'Entrée',
                    channelId: 'channel-1',
                    interactive: true,
                    interactiveUrl: 'https://example.com/kiosk',
                }}
            />,
        );

        fireEvent.click(screen.getByLabelText('Écran interactif'));
        fireEvent.click(screen.getByRole('button', {name: 'Enregistrer'}));

        await waitFor(() => {
            expect(updateScreenMock).toHaveBeenCalledWith('screen-3', {
                name: 'Écran borne',
                location: 'Entrée',
                channelId: 'channel-1',
                interactive: false,
                interactiveUrl: '',
            });
        });
    });
});
