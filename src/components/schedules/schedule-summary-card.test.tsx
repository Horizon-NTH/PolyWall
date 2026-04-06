import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ScheduleType } from '@/generated/prisma/enums';
import { ScheduleSummaryCard } from '@/components/schedules/schedule-summary-card';

vi.mock('next/navigation', () => ({
    usePathname: () => '/dashboard/schedules/schedule-1',
    useSearchParams: () => new URLSearchParams(),
}));

describe('ScheduleSummaryCard', () => {
    it('renders navigation links to the playlist and channel details pages', () => {
        render(
            <ScheduleSummaryCard
                schedule={{
                    id: 'schedule-1',
                    type: ScheduleType.EVENT,
                    active: true,
                    playlistId: 'playlist-1',
                    playlistName: 'Playlist événementielle',
                    channelId: 'channel-1',
                    channelName: 'Accueil',
                    startDate: new Date().toISOString(),
                    endDate: new Date().toISOString(),
                    daysLabel: 'Lundi',
                    dateLabel: '6 avr. 2026',
                    timeLabel: '09:00 - 10:00',
                    updatedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    slots: [],
                }}
            />,
        );

        expect(screen.getByRole('link', {name: 'Playlist événementielle'})).toHaveAttribute(
            'href',
            '/dashboard/playlists/playlist-1?returnTo=%2Fdashboard%2Fschedules%2Fschedule-1',
        );
        expect(screen.getByRole('link', {name: 'Accueil'})).toHaveAttribute(
            'href',
            '/dashboard/channels/channel-1?returnTo=%2Fdashboard%2Fschedules%2Fschedule-1',
        );
    });
});
