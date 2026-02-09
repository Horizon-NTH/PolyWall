import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ChannelActionsCard } from '@/components/channels/channel-actions-card';

const replaceMock = vi.fn();
const deleteChannelMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        replace: replaceMock,
    }),
}));

vi.mock('@/components/ui/select', () => ({
    Select: ({children, value, onValueChange, disabled}: {
        children: ReactNode;
        value?: string;
        onValueChange?: (value: string) => void;
        disabled?: boolean;
    }) => (
        <select
            data-testid="reassign-select"
            disabled={disabled}
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

vi.mock('@/actions/channel-actions', () => ({
    deleteChannel: (...args: unknown[]) => deleteChannelMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
        error: (...args: unknown[]) => toastErrorMock(...args),
    },
}));

describe('ChannelActionsCard', () => {
    beforeEach(() => {
        replaceMock.mockReset();
        deleteChannelMock.mockReset();
        toastSuccessMock.mockReset();
        toastErrorMock.mockReset();
    });

    it('requires reassign channel selection when screens are attached', async () => {
        render(
            <ChannelActionsCard
                channelId="channel-1"
                channelName="Hall principal"
                screensCount={2}
                reassignOptions={[{id: 'channel-2', name: 'Cafétéria'}]}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Supprimer'}));
        const dialog = await screen.findByRole('alertdialog');

        const confirmDeleteButton = within(dialog).getByRole('button', {name: 'Supprimer'});
        expect(confirmDeleteButton).toBeDisabled();

        fireEvent.change(screen.getByTestId('reassign-select'), {target: {value: 'channel-2'}});
        expect(confirmDeleteButton).not.toBeDisabled();
    });

    it('deletes without reassign option when no screens are attached', async () => {
        deleteChannelMock.mockResolvedValueOnce({ok: true, channelId: 'channel-1'});

        render(
            <ChannelActionsCard
                channelId="channel-1"
                channelName="Hall principal"
                screensCount={0}
                reassignOptions={[]}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Supprimer'}));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));

        await waitFor(() => {
            expect(deleteChannelMock).toHaveBeenCalledWith('channel-1', {
                reassignToChannelId: undefined,
            });
            expect(toastSuccessMock).toHaveBeenCalledWith('Canal supprimé.');
            expect(replaceMock).toHaveBeenCalledWith('/dashboard/channels');
        });
    });
});
