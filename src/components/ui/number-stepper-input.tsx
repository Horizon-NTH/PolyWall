'use client';

import { MinusIcon, PlusIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Input } from '@/components/ui/input';

type NumberStepperInputProps = {
    id: string;
    value: number | undefined;
    onValueChange: (value: number | undefined) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    ariaInvalid?: boolean;
    placeholder?: string;
    required?: boolean;
    allowEmpty?: boolean;
    decrementFromEmptyToMin?: boolean;
    decrementAriaLabel?: string;
    incrementAriaLabel?: string;
};

function clamp(value: number, min: number, max?: number) {
    if (typeof max === 'number') {
        return Math.max(min, Math.min(max, value));
    }
    return Math.max(min, value);
}

export function NumberStepperInput({
                                       id,
                                       value,
                                       onValueChange,
                                       min = 1,
                                       max,
                                       step = 1,
                                       disabled = false,
                                       ariaInvalid = false,
                                       placeholder,
                                       required = false,
                                       allowEmpty = false,
                                       decrementFromEmptyToMin = false,
                                       decrementAriaLabel = 'Décrément',
                                       incrementAriaLabel = 'Incrément',
                                   }: NumberStepperInputProps) {
    const current = Number(value);
    const hasValue = Number.isFinite(current);

    const handleInputChange = (raw: string) => {
        if (raw === '') {
            onValueChange(undefined);
            return;
        }

        const parsed = Number(raw);
        if (Number.isNaN(parsed)) {
            onValueChange(undefined);
            return;
        }

        onValueChange(clamp(Math.trunc(parsed), min, max));
    };

    const handleDecrement = () => {
        if (!hasValue) {
            if (decrementFromEmptyToMin) {
                onValueChange(min);
            }
            return;
        }

        if (current <= min) {
            if (allowEmpty) {
                onValueChange(undefined);
            }
            return;
        }

        onValueChange(clamp(current - step, min, max));
    };

    const handleIncrement = () => {
        if (!hasValue) {
            onValueChange(min);
            return;
        }

        onValueChange(clamp(current + step, min, max));
    };

    const decrementDisabled =
        disabled ||
        (!hasValue && !decrementFromEmptyToMin) ||
        (hasValue && current <= min && !allowEmpty);

    const incrementDisabled =
        disabled || (hasValue && typeof max === 'number' && current >= max);

    return (
        <ButtonGroup>
            <Input
                id={id}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={hasValue ? current : ''}
                onChange={(event) => handleInputChange(event.target.value)}
                aria-invalid={ariaInvalid}
                disabled={disabled}
                placeholder={placeholder}
                required={required}
            />
            <Button
                variant="outline"
                size="icon"
                type="button"
                aria-label={decrementAriaLabel}
                onClick={handleDecrement}
                disabled={decrementDisabled}
            >
                <MinusIcon />
            </Button>
            <Button
                variant="outline"
                size="icon"
                type="button"
                aria-label={incrementAriaLabel}
                onClick={handleIncrement}
                disabled={incrementDisabled}
            >
                <PlusIcon />
            </Button>
        </ButtonGroup>
    );
}
