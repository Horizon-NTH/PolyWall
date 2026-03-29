import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ChannelSummaryCard } from '@/components/channels/channel-summary-card';
import { formatDate } from '@/lib/utils';

describe('ChannelSummaryCard', () => {
    it('renders channel details and dates', () => {
        const createdAt = '2026-02-01T12:00:00.000Z';
        const updatedAt = '2026-02-03T12:00:00.000Z';

        render(
            <ChannelSummaryCard
                description="Canal principal du hall"
                displayTemplateName="Template Dashboard 16:9"
                screensCount={3}
                schedulesCount={5}
                createdAt={createdAt}
                updatedAt={updatedAt}
            />,
        );

        expect(screen.getByText('Informations')).toBeInTheDocument();
        expect(screen.getByText('Résumé du canal et de son affectation.')).toBeInTheDocument();
        expect(screen.getByText('Canal principal du hall')).toBeInTheDocument();
        expect(screen.getByText('Template Dashboard 16:9')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText(formatDate(new Date(createdAt)))).toBeInTheDocument();
        expect(screen.getByText(formatDate(new Date(updatedAt)))).toBeInTheDocument();
    });
});
