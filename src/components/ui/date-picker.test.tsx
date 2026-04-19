import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { DatePicker } from '@/components/ui/date-picker';

vi.mock('@/components/ui/calendar', () => ({
    Calendar: ({onSelect}: { onSelect: (date?: Date) => void }) => (
        <button type="button" onClick={() => onSelect(new Date(2026, 3, 20))}>Choisir 20/04/2026</button>
    ),
}));

describe('DatePicker', () => {
    it('renders placeholder and updates selected date', () => {
        const onChange = vi.fn();

        render(<DatePicker onChange={onChange} placeholder="Choisir une date" />);

        expect(screen.getByRole('button', {name: /Choisir une date/i})).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: /Choisir une date/i}));
        fireEvent.click(screen.getByRole('button', {name: 'Choisir 20/04/2026'}));

        expect(onChange).toHaveBeenCalledWith('2026-04-20');
    });

    it('clears the value with clear button', () => {
        const onChange = vi.fn();

        render(
            <DatePicker
                value="2026-04-20"
                onChange={onChange}
                clearButton
            />, 
        );

        fireEvent.click(screen.getByRole('button', {name: 'Vider la date'}));

        expect(onChange).toHaveBeenCalledWith('');
    });
});
