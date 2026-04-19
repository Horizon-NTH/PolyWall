import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { NumberStepperInput } from '@/components/ui/number-stepper-input';

describe('NumberStepperInput', () => {
    it('increments and decrements within bounds', () => {
        const onValueChange = vi.fn();

        render(
            <NumberStepperInput
                id="freq"
                value={3}
                min={1}
                max={5}
                onValueChange={onValueChange}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Incrément'}));
        fireEvent.click(screen.getByRole('button', {name: 'Décrément'}));

        expect(onValueChange).toHaveBeenNthCalledWith(1, 4);
        expect(onValueChange).toHaveBeenNthCalledWith(2, 2);
    });

    it('supports decrement from empty to min and clearing from minimum', () => {
        const onValueChange = vi.fn();

        render(
            <NumberStepperInput
                id="repeat"
                value={undefined}
                min={2}
                allowEmpty
                decrementFromEmptyToMin
                onValueChange={onValueChange}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Décrément'}));

        expect(onValueChange).toHaveBeenCalledWith(2);

        onValueChange.mockReset();

        render(
            <NumberStepperInput
                id="repeat-2"
                value={2}
                min={2}
                allowEmpty
                onValueChange={onValueChange}
            />,
        );

        fireEvent.click(screen.getAllByRole('button', {name: 'Décrément'})[1]);
        expect(onValueChange).toHaveBeenCalledWith(undefined);
    });
});
