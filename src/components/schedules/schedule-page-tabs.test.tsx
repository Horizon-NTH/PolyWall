import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ScheduleType } from '@/generated/prisma/enums';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
    usePathname: () => '/dashboard/schedules',
    useSearchParams: () => new URLSearchParams(''),
    useRouter: () => ({replace: replaceMock}),
}));

vi.mock('@/components/schedules/schedules-table', () => ({
    SchedulesTable: () => <div>Table schedules</div>,
}));

vi.mock('@/components/schedules/schedules-calendar', () => ({
    SchedulesCalendar: () => <div>Calendar schedules</div>,
}));

describe('SchedulePageTabs', () => {
    it('switches from table to calendar view', async () => {
        replaceMock.mockReset();
        const {SchedulePageTabs} = await import('@/components/schedules/schedule-page-tabs');

        render(
            <SchedulePageTabs
                canManage
                channelContent={<div>Channel content</div>}
                schedules={[{
                    id: 'schedule-1',
                    type: ScheduleType.EVENT,
                    active: true,
                    playlistId: 'playlist-1',
                    playlistName: 'Actus',
                    channelId: 'channel-1',
                    channelName: 'Hall',
                    startDate: new Date().toISOString(),
                    endDate: new Date().toISOString(),
                    daysLabel: 'Ponctuelle',
                    dateLabel: '18 avr. 2026',
                    timeLabel: '15:00 - 16:00',
                    lifecycleStatus: 'ongoing',
                    updatedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    slots: [],
                }]}
            />,
        );

        expect(screen.getByText('Table schedules')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('tab', {name: 'Planning'}));
        expect(screen.getByText('Calendar schedules')).toBeInTheDocument();
        expect(replaceMock).toHaveBeenCalledWith('/dashboard/schedules?tab=calendar');
        fireEvent.click(screen.getByRole('tab', {name: 'Canal'}));
        expect(screen.getByText('Channel content')).toBeInTheDocument();
        expect(replaceMock).toHaveBeenCalledWith('/dashboard/schedules?tab=channel');
        fireEvent.click(screen.getByRole('tab', {name: 'Programmations'}));
        expect(replaceMock).toHaveBeenCalledWith('/dashboard/schedules?tab=schedules');
        expect(replaceMock).toHaveBeenCalledTimes(3);
    });
});
