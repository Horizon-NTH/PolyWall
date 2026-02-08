import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { MediaFilters } from '@/components/media/media-filters';
import { mediaListFilterSchema } from '@/schemas/media-schema';

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));

describe('MediaFilters', () => {
    const baseFilters = mediaListFilterSchema.parse({});

    it('renders search input and create button', () => {
        render(
            <MediaFilters
                filters={baseFilters}
                onChange={vi.fn()}
                onReset={vi.fn()}
                showReset={false}
            />,
        );

        expect(screen.getByPlaceholderText('Rechercher un média...')).toHaveValue('');
        expect(screen.getByRole('link', {name: 'Créer'})).toHaveAttribute('href', '/dashboard/media/new');
        expect(screen.queryByRole('button', {name: 'Réinitialiser'})).not.toBeInTheDocument();
    });

    it('calls onChange when search query changes', () => {
        const onChange = vi.fn();
        render(
            <MediaFilters
                filters={baseFilters}
                onChange={onChange}
                onReset={vi.fn()}
                showReset={false}
            />,
        );

        fireEvent.change(screen.getByPlaceholderText('Rechercher un média...'), {
            target: {value: 'Hall'},
        });

        expect(onChange).toHaveBeenCalledWith({q: 'Hall'});
    });

    it('shows reset button and calls onReset', () => {
        const onReset = vi.fn();
        render(
            <MediaFilters
                filters={baseFilters}
                onChange={vi.fn()}
                onReset={onReset}
                showReset={true}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Réinitialiser'}));
        expect(onReset).toHaveBeenCalledTimes(1);
    });
});
