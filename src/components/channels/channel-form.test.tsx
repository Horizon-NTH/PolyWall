import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ChannelForm } from '@/components/channels/channel-form';
import { routerMock } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';

const createChannelMock = vi.fn();
const updateChannelMock = vi.fn();

vi.mock('@/components/ui/select', () => ({
    Select: ({children, value, onValueChange}: {
        children: ReactNode;
        value?: string;
        onValueChange?: (value: string) => void;
    }) => (
        <select
            data-testid="select-template"
            value={value}
            onChange={(event) => onValueChange?.(event.target.value)}
        >
            {children}
        </select>
    ),
    SelectTrigger: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectValue: ({placeholder}: { placeholder?: string }) => <option value="">{placeholder}</option>,
    SelectContent: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectGroup: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectLabel: () => null,
    SelectItem: ({value, children}: { value: string; children: ReactNode }) => (
        <option value={value}>{children}</option>
    ),
}));

vi.mock('@/actions/channel-actions', () => ({
    createChannel: (...args: unknown[]) => createChannelMock(...args),
    updateChannel: (...args: unknown[]) => updateChannelMock(...args),
}));

describe('ChannelForm', () => {
    const templates = [
        {id: 'template-1', name: 'Template global', organizationId: null},
        {id: 'template-2', name: 'Template org', organizationId: 'org-1'},
    ];

    beforeEach(() => {
        createChannelMock.mockReset();
        updateChannelMock.mockReset();
    });

    it('creates a channel and redirects on success', async () => {
        createChannelMock.mockResolvedValueOnce({ok: true, channelId: 'channel-1'});

        render(
            <ChannelForm
                mode="create"
                templates={templates}
                cancelHref="/dashboard/channels"
            />,
        );

        fireEvent.change(screen.getByLabelText('Nom'), {target: {value: 'Hall principal'}});
        fireEvent.change(screen.getByLabelText('Description'), {target: {value: 'Canal du hall'}});
        fireEvent.change(screen.getByTestId('select-template'), {target: {value: 'template-1'}});
        fireEvent.click(screen.getByRole('button', {name: 'Créer'}));

        await waitFor(() => {
            expect(createChannelMock).toHaveBeenCalledWith({
                name: 'Hall principal',
                description: 'Canal du hall',
                displayTemplateId: 'template-1',
            });
            expect(toastMock.success).toHaveBeenCalledWith('Canal créé.');
            expect(routerMock.push).toHaveBeenCalledWith('/dashboard/channels/channel-1');
        });
    });

    it('updates a channel and redirects on success', async () => {
        updateChannelMock.mockResolvedValueOnce({ok: true, channelId: 'channel-2'});

        render(
            <ChannelForm
                mode="edit"
                channelId="channel-2"
                templates={templates}
                cancelHref="/dashboard/channels/channel-2"
                defaultValues={{
                    name: 'Hall principal',
                    description: 'Canal du hall',
                    displayTemplateId: 'template-1',
                }}
            />,
        );

        fireEvent.change(screen.getByLabelText('Nom'), {target: {value: 'Cafétéria'}});
        fireEvent.change(screen.getByTestId('select-template'), {target: {value: 'template-2'}});
        fireEvent.click(screen.getByRole('button', {name: 'Enregistrer'}));

        await waitFor(() => {
            expect(updateChannelMock).toHaveBeenCalledWith('channel-2', {
                name: 'Cafétéria',
                description: 'Canal du hall',
                displayTemplateId: 'template-2',
            });
            expect(toastMock.success).toHaveBeenCalledWith('Canal mis à jour.');
            expect(routerMock.push).toHaveBeenCalledWith('/dashboard/channels/channel-2');
        });
    });

    it('shows warning and disables creation when no template is available', () => {
        render(
            <ChannelForm
                mode="create"
                templates={[]}
                cancelHref="/dashboard/channels"
            />,
        );

        expect(
            screen.getByText(
                'Impossible de créer un canal sans modèle d\'affichage. Créez d\'abord un modèle d\'affichage.',
            ),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Créer'})).toBeDisabled();
    });
});
