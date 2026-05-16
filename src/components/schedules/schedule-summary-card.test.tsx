import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ScheduleSummaryCard } from '@/components/schedules/schedule-summary-card';
import { ScheduleType } from '@/generated/prisma/enums';
import { buildScheduleViewModel } from '@/test/fixtures/builders';
import { setMockPathname } from '@/test/mocks/next-navigation';

describe('ScheduleSummaryCard', () => {
    beforeEach(() => {
        setMockPathname('/dashboard/schedules/schedule-1');
    });

    it('renders navigation links to the playlist and channel details pages', () => {
        render(
            <ScheduleSummaryCard
                schedule={buildScheduleViewModel({
                    type: ScheduleType.EVENT,
                    playlistName: 'Playlist événementielle',
                    channelName: 'Accueil',
                    daysLabel: 'Lundi',
                    dateLabel: '6 avr. 2026',
                })}
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
