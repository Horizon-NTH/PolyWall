import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ScreenStatus } from '@/generated/prisma/enums';
import { ScreenSummaryCard } from '@/components/screens/screen-summary-card';
import { formatDate } from '@/lib/utils';

describe('ScreenSummaryCard', () => {
    it('renders screen details, statuses, and dates', () => {
        const createdAt = '2026-02-01T12:00:00.000Z';
        const updatedAt = '2026-02-03T12:00:00.000Z';
        const approvedAt = '2026-02-04T12:00:00.000Z';
        const revokedAt = '2026-02-05T12:00:00.000Z';
        const lastSeenAt = '2026-02-06T12:00:00.000Z';

        render(
            <ScreenSummaryCard
                status={ScreenStatus.ACTIVE}
                deviceId="device-123"
                location="Hall principal"
                channelName="Accueil"
                interactive={true}
                interactiveUrl="https://example.com/interactive"
                inactivityTimeoutSeconds={120}
                createdAt={createdAt}
                updatedAt={updatedAt}
                approvedAt={approvedAt}
                revokedAt={revokedAt}
                lastSeenAt={lastSeenAt}
            />,
        );

        expect(screen.getByText('Informations')).toBeInTheDocument();
        expect(screen.getByText("Résumé de l'écran et de sa configuration.")).toBeInTheDocument();
        expect(screen.getByText('Actif')).toBeInTheDocument();
        expect(screen.getByText('Accueil')).toBeInTheDocument();
        expect(screen.getByText('Hall principal')).toBeInTheDocument();
        expect(screen.getByText('device-123')).toBeInTheDocument();
        expect(screen.getByText('Oui')).toBeInTheDocument();
        expect(screen.getByText('120s')).toBeInTheDocument();
        expect(screen.getByText('https://example.com/interactive')).toBeInTheDocument();
        expect(screen.getByText(formatDate(new Date(lastSeenAt)))).toBeInTheDocument();
        expect(screen.getByText(formatDate(new Date(approvedAt)))).toBeInTheDocument();
        expect(screen.getByText(formatDate(new Date(revokedAt)))).toBeInTheDocument();
        expect(screen.getByText(formatDate(new Date(updatedAt)))).toBeInTheDocument();
        expect(screen.getByText(formatDate(new Date(createdAt)))).toBeInTheDocument();
    });

    it('renders fallback values when optional data is missing', () => {
        render(
            <ScreenSummaryCard
                status={ScreenStatus.PENDING}
                deviceId="device-456"
                location="Salle 2"
                channelName={null}
                interactive={false}
                interactiveUrl={null}
                inactivityTimeoutSeconds={null}
                createdAt="2026-02-01T12:00:00.000Z"
                updatedAt="2026-02-03T12:00:00.000Z"
                approvedAt={null}
                revokedAt={null}
                lastSeenAt={null}
            />,
        );

        expect(screen.getByText('En attente')).toBeInTheDocument();
        expect(screen.getByText('Aucun')).toBeInTheDocument();
        expect(screen.getAllByText('Non')).toHaveLength(2);
        expect(screen.getByText('Non défini')).toBeInTheDocument();
        expect(screen.getByText('Aucune')).toBeInTheDocument();
        expect(screen.getByText('Inconnue')).toBeInTheDocument();
        expect(screen.getByText('Non validé')).toBeInTheDocument();
    });
});
