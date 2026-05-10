import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { HelpLabel } from '@/components/ui/help-label';

vi.mock('@/components/ui/tooltip', () => ({
    Tooltip: ({children}: { children: React.ReactNode }) => <>{children}</>,
    TooltipTrigger: ({children}: { children: React.ReactNode }) => <>{children}</>,
    TooltipContent: ({children}: { children: React.ReactNode }) => <div role="tooltip">{children}</div>,
}));

describe('HelpLabel', () => {
    it('renders a label associated with a field and an accessible help trigger', () => {
        render(
            <>
                <HelpLabel htmlFor="refresh" help="Fréquence en secondes.">
                    Rafraîchissement
                </HelpLabel>
                <input id="refresh" />
            </>,
        );

        expect(screen.getByLabelText('Rafraîchissement')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Aide: Rafraîchissement'})).toHaveAttribute('type', 'button');
        expect(screen.getByRole('tooltip')).toHaveTextContent('Fréquence en secondes.');
    });
});
