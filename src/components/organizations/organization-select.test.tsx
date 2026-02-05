import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OrganizationSelect } from '@/components/organizations/organization-select';

const switchToMock = vi.fn();

vi.mock('@/hooks/use-organization-switch', () => ({
    useOrganizationSwitch: () => ({
        isPending: false,
        switchTo: switchToMock,
    }),
}));

vi.mock('@/components/ui/select', () => ({
    Select: ({children, onValueChange, disabled}: {
        children: ReactNode;
        onValueChange?: (value: string) => void;
        disabled?: boolean
    }) => (
        <select
            data-testid="select"
            disabled={disabled}
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

describe('OrganizationSelect', () => {
    it('renders empty message when no organizations', () => {
        render(<OrganizationSelect organizations={[]} />);

        expect(
            screen.getByText('Aucune organisation disponible.'),
        ).toBeInTheDocument();
        expect(screen.queryByTestId('select')).not.toBeInTheDocument();
    });

    it('calls switchTo when selection changes', () => {
        render(
            <OrganizationSelect
                organizations={[
                    {id: 'org-1', name: 'Org One'},
                    {id: 'org-2', name: 'Org Two'},
                ]}
            />,
        );

        fireEvent.change(screen.getByTestId('select'), {
            target: {value: 'org-2'},
        });

        expect(switchToMock).toHaveBeenCalledWith('org-2');
    });
});
