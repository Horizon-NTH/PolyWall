import type { ReactNode } from 'react';

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { ChannelDeleteDialog } from '@/components/channels/channel-delete-dialog';

vi.mock('@/components/ui/select', () => ({
    Select: ({children, value, onValueChange, disabled}: {
        children: ReactNode;
        value?: string;
        onValueChange?: (value: string) => void;
        disabled?: boolean;
    }) => (
        <select
            data-testid="channel-delete-select"
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

describe('ChannelDeleteDialog', () => {
    it('shows reassign selection when screens are attached', () => {
        const onConfirm = vi.fn();
        const onReassignChange = vi.fn();

        render(
            <ChannelDeleteDialog
                open={true}
                screensCount={2}
                reassignToChannelId=""
                onReassignToChannelIdChange={onReassignChange}
                reassignOptions={[{id: 'channel-2', name: 'Cafétéria'}]}
                onConfirm={onConfirm}
                confirmDisabled={true}
            />,
        );

        const dialog = screen.getByRole('alertdialog');
        expect(within(dialog).getByText(/Les écrans seront réaffectés/)).toBeInTheDocument();
        expect(screen.getByTestId('channel-delete-select')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', {name: 'Supprimer'})).toBeDisabled();

        fireEvent.change(screen.getByTestId('channel-delete-select'), {target: {value: 'channel-2'}});
        expect(onReassignChange).toHaveBeenCalledWith('channel-2');
    });

    it('can hide the reassign field while keeping the warning text', () => {
        render(
            <ChannelDeleteDialog
                open={true}
                screensCount={1}
                reassignToChannelId=""
                onReassignToChannelIdChange={() => {}}
                reassignOptions={[{id: 'channel-2', name: 'Cafétéria'}]}
                showReassignField={false}
                onConfirm={() => {}}
            />,
        );

        const dialog = screen.getByRole('alertdialog');
        expect(within(dialog).getByText(/Les écrans seront réaffectés/)).toBeInTheDocument();
        expect(screen.queryByTestId('channel-delete-select')).not.toBeInTheDocument();
    });
});
