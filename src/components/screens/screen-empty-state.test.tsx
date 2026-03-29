import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ScreenEmptyState } from '@/components/screens/screen-empty-state';

describe('ScreenEmptyState', () => {
    it('renders the empty state copy', () => {
        render(<ScreenEmptyState />);

        expect(screen.getByText('Aucun écran')).toBeInTheDocument();
        expect(
            screen.getByText("Aucun écran n'est encore appairé avec cette organisation."),
        ).toBeInTheDocument();
    });
});
