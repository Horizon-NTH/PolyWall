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
        render(<ScheduleDefaultCard channelId="channel-1" defaultSchedule={null} defaultPlaylist={null} />);

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
                    timeLabel: 'Toute la journée',
                    lifecycleStatus: 'ongoing',
                    updatedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    slots: [],
                }}
                defaultPlaylist={{
                    id: 'playlist-1',
                    name: 'Playlist par défaut',
                    mediaCount: 5,
                    totalDurationLabel: '2:30',
                    previewItems: [
                        {title: 'Visuel 1', thumbUrl: null},
                        {title: 'Visuel 2', thumbUrl: null},
                        {title: 'Visuel 3', thumbUrl: null},
                    ],
                }}
            />,
        );

        expect(screen.getByRole('link', {name: /Modifier la playlist par défaut/i})).toHaveAttribute(
            'href',
            '/dashboard/schedules/schedule-1/edit?returnTo=%2Fdashboard%2Fschedules',
        );
        expect(screen.getByRole('link', {name: 'Playlist par défaut'})).toHaveAttribute(
            'href',
            '/dashboard/playlists/playlist-1?returnTo=%2Fdashboard%2Fschedules',
        );
        expect(screen.getByText(/5 médias · 2:30/i)).toBeInTheDocument();
        expect(screen.getByText('+2')).toBeInTheDocument();
    });
});
