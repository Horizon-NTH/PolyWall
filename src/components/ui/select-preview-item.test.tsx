import React, { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { SelectPreviewItem } from '@/components/ui/select-preview-item';

vi.mock('radix-ui', () => ({
    Select: {
        Item: ({
                   children,
                   value,
                   textValue,
                   className,
               }: {
            children: ReactNode;
            value: string;
            textValue: string;
            className?: string;
        }) => (
            <div role="option" data-value={value} data-text-value={textValue} className={className}>
                {children}
            </div>
        ),
        ItemText: ({children}: { children: ReactNode }) => <span data-testid="item-text">{children}</span>,
        ItemIndicator: ({children}: { children: ReactNode }) => <span data-testid="item-indicator">{children}</span>,
    },
}));

describe('SelectPreviewItem', () => {
    it('renders custom preview content with accessible text and selected indicator slot', () => {
        render(
            <SelectPreviewItem value="media-1" textValue="Logo BDE">
                <span>Preview logo</span>
            </SelectPreviewItem>,
        );

        const option = screen.getByRole('option');
        expect(option).toHaveAttribute('data-value', 'media-1');
        expect(option).toHaveAttribute('data-text-value', 'Logo BDE');
        expect(option).toHaveTextContent('Preview logo');
        expect(screen.getByTestId('item-text')).toHaveTextContent('Logo BDE');
        expect(screen.getByTestId('item-indicator')).toBeInTheDocument();
    });
});
