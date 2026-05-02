import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DisplayDebugPanel } from '@/components/screens/display-debug-panel';

vi.mock('@/components/ui/select', () => ({
    Select: ({
        children,
        value,
        onValueChange,
    }: {
        children: React.ReactNode;
        value?: string;
        onValueChange?: (value: string) => void;
    }) => (
        <select data-testid="preset-select" value={value} onChange={(event) => onValueChange?.(event.target.value)}>
            {children}
        </select>
    ),
    SelectTrigger: ({children}: {children: React.ReactNode}) => <>{children}</>,
    SelectValue: ({placeholder}: {placeholder?: string}) => <option value="">{placeholder}</option>,
    SelectContent: ({children}: {children: React.ReactNode}) => <>{children}</>,
    SelectGroup: ({children}: {children: React.ReactNode}) => <>{children}</>,
    SelectItem: ({value, children}: {value: string; children: React.ReactNode}) => <option value={value}>{children}</option>,
}));

vi.mock('@/components/ui/collapsible', async () => {
    const React = await import('react');
    const context = React.createContext<{open: boolean; setOpen: (open: boolean) => void} | null>(null);

    return {
        Collapsible: ({
            children,
            open,
            onOpenChange,
        }: {
            children: React.ReactNode;
            open: boolean;
            onOpenChange: (open: boolean) => void;
        }) => <context.Provider value={{open, setOpen: onOpenChange}}>{children}</context.Provider>,
        CollapsibleContent: ({children, ...props}: React.ComponentProps<'div'>) => {
            const value = React.useContext(context);
            if (!value?.open) return null;
            return <div {...props}>{children}</div>;
        },
        CollapsibleTrigger: ({children}: {children: React.ReactElement}) => {
            const value = React.useContext(context);
            const child = children as React.ReactElement<{onClick?: (event: React.MouseEvent) => void}>;
            return React.cloneElement(child, {
                onClick: (event: React.MouseEvent) => {
                    child.props.onClick?.(event);
                    value?.setOpen(!value.open);
                },
            });
        },
    };
});

describe('DisplayDebugPanel', () => {
    it('opens from the floating bubble and applies pointer cursor styling', () => {
        const onPresetChange = vi.fn();
        render(<DisplayDebugPanel preset="live" onPresetChange={onPresetChange} />);

        const trigger = screen.getByRole('button', {name: 'Ouvrir Display Debug'});
        expect(trigger).toHaveClass('cursor-pointer');

        fireEvent.click(trigger);

        expect(screen.getByTestId('preset-select')).toHaveValue('live');
    });

    it('closes when clicking outside the panel', () => {
        render(
            <div>
                <button type="button">outside</button>
                <DisplayDebugPanel preset="live" onPresetChange={vi.fn()} />
            </div>,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Ouvrir Display Debug'}));
        expect(screen.getByTestId('preset-select')).toBeInTheDocument();

        fireEvent.mouseDown(screen.getByRole('button', {name: 'outside'}));

        expect(screen.queryByTestId('preset-select')).not.toBeInTheDocument();
    });

    it('forwards preset changes and allows resetting to live', () => {
        const onPresetChange = vi.fn();
        render(<DisplayDebugPanel preset="playing" onPresetChange={onPresetChange} />);

        fireEvent.click(screen.getByRole('button', {name: 'Ouvrir Display Debug'}));
        fireEvent.change(screen.getByTestId('preset-select'), {target: {value: 'degraded'}});
        fireEvent.click(screen.getByRole('button', {name: /Revenir au live/}));

        expect(onPresetChange).toHaveBeenNthCalledWith(1, 'degraded');
        expect(onPresetChange).toHaveBeenNthCalledWith(2, 'live');
    });
});
