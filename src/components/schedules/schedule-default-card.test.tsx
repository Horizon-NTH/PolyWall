import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ScheduleType } from '@/generated/prisma/enums';
import { ScheduleDefaultCard } from '@/components/schedules/schedule-default-card';

vi.mock('next/navigation', () => ({
    usePathname: () => '/dashboard/schedules',
    useSearchParams: () => new URLSearchParams(),
}));

describe('ScheduleDefaultCard', () => {
    it('renders the empty state when no default schedule exists', () => {
        render(<ScheduleDefaultCard channelId="channel-1" defaultSchedule={null} />);

        expect(screen.getByText(/Aucune playlist par défaut/i)).toBeInTheDocument();
        expect(screen.getByRole('link', {name: /Définir la playlist par défaut/i})).toHaveAttribute(
            'href',
            '/dashboard/schedules/new?channelId=channel-1&type=DEFAULT&returnTo=%2Fdashboard%2Fschedules',
        );
    });

    it('renders the default schedule details', () => {
        render(
            <ScheduleDefaultCard
                channelId="channel-1"
                defaultSchedule={{
                    id: 'schedule-1',
                    type: ScheduleType.DEFAULT,
                    active: true,
                    playlistId: 'playlist-1',
                    playlistName: 'Playlist par défaut',
                    channelId: 'channel-1',
                    channelName: 'Hall',
                    startDate: null,
                    endDate: null,
                    daysLabel: 'Tous les jours',
                    dateLabel: 'Toujours active',
                    timeLabel: '00:00 - 23:59',
                    updatedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    slots: [],
                }}
            />,
        );

        expect(screen.getByRole('link', {name: /Modifier la playlist par défaut/i})).toHaveAttribute(
            'href',
            '/dashboard/schedules/schedule-1/edit?returnTo=%2Fdashboard%2Fschedules',
        );
        expect(screen.getByText(/Canal:\s*Hall/i)).toBeInTheDocument();
    });
});
