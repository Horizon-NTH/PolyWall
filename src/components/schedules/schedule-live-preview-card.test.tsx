import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ScheduleLivePreviewCard } from '@/components/schedules/schedule-live-preview-card';

describe('ScheduleLivePreviewCard', () => {
    it('renders placeholder copy', () => {
        render(<ScheduleLivePreviewCard />);

        expect(screen.getByText('Aperçu de diffusion')).toBeInTheDocument();
        expect(screen.getByText('Bientôt disponible')).toBeInTheDocument();
    });
});
