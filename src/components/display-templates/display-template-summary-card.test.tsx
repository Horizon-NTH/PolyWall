import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DisplayTemplateSummaryCard } from '@/components/display-templates/display-template-summary-card';
import { formatDate } from '@/lib/utils';

describe('DisplayTemplateSummaryCard', () => {
    it('renders template metadata, counters and dates', () => {
        const createdAt = '2026-05-01T10:00:00.000Z';
        const updatedAt = '2026-05-02T10:00:00.000Z';

        render(
            <DisplayTemplateSummaryCard
                description="Template principal du hall"
                scope="global"
                resolution="1920x1080"
                zonesCount={3}
                widgetsCount={1}
                channelsCount={2}
                createdAt={createdAt}
                updatedAt={updatedAt}
            />,
        );

        expect(screen.getByText('Informations')).toBeInTheDocument();
        expect(screen.getByText('Résumé du modèle et de son usage.')).toBeInTheDocument();
        expect(screen.getByText('Template principal du hall')).toBeInTheDocument();
        expect(screen.getByText('Global')).toBeInTheDocument();
        expect(screen.getByText('1920x1080')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText(formatDate(new Date(createdAt)))).toBeInTheDocument();
        expect(screen.getByText(formatDate(new Date(updatedAt)))).toBeInTheDocument();
    });

    it('renders organization scope label', () => {
        render(
            <DisplayTemplateSummaryCard
                description="Template organisation"
                scope="organization"
                resolution="1280x720"
                zonesCount={1}
                widgetsCount={0}
                channelsCount={0}
                createdAt="2026-05-01T10:00:00.000Z"
                updatedAt="2026-05-01T10:00:00.000Z"
            />,
        );

        expect(screen.getByText('Organisation')).toBeInTheDocument();
    });
});
