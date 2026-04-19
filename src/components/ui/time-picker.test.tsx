import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import { TimePicker } from '@/components/ui/time-picker';

vi.mock('@/components/ui/scroll-area', () => ({
    ScrollArea: ({children}: { children: ReactNode }) => <div>{children}</div>,
}));

describe('TimePicker', () => {
    it('applies preset value when selected', () => {
        const onChange = vi.fn();

        render(
            <TimePicker
                value="08:00"
                onChange={onChange}
                presets={[{label: 'Début de journée', value: '00:00'}]}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: /08:00/i}));
        fireEvent.click(screen.getByRole('button', {name: 'Début de journée'}));

        expect(onChange).toHaveBeenCalledWith('00:00');
    });

    it('disables presets outside min/max bounds', () => {
        const onChange = vi.fn();

        render(
            <TimePicker
                value="10:00"
                onChange={onChange}
                minValue="09:00"
                maxValue="11:00"
                presets={[
                    {label: 'Trop tôt', value: '08:00'},
                    {label: 'Valide', value: '10:30'},
                ]}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: /10:00/i}));

        expect(screen.getByRole('button', {name: 'Trop tôt'})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Valide'})).toBeEnabled();
    });
});
