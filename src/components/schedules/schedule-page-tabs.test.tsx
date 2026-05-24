import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { routerMock, setMockPathname, setMockSearchParams } from '@/test/mocks/next-navigation';
import { buildScheduleViewModel } from '@/test/fixtures/builders';

vi.mock('@/components/schedules/schedules-table', () => ({
    SchedulesTable: () => <div>Table schedules</div>,
}));

vi.mock('@/components/schedules/schedules-calendar', () => ({
    SchedulesCalendar: () => <div>Calendar schedules</div>,
}));

describe('SchedulePageTabs', () => {
    it('switches from table to calendar view', async () => {
        setMockPathname('/dashboard/schedules');
        setMockSearchParams('');
        const {SchedulePageTabs} = await import('@/components/schedules/schedule-page-tabs');

        render(
            <SchedulePageTabs
                canManage
                channelContent={<div>Channel content</div>}
                schedules={[buildScheduleViewModel()]}
            />,
        );

        expect(screen.getByText('Table schedules')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('tab', {name: 'Planning'}));
        expect(screen.getByText('Calendar schedules')).toBeInTheDocument();
        expect(routerMock.replace).toHaveBeenCalledWith('/dashboard/schedules?tab=calendar');
        fireEvent.click(screen.getByRole('tab', {name: 'Canal'}));
        expect(screen.getByText('Channel content')).toBeInTheDocument();
        expect(routerMock.replace).toHaveBeenCalledWith('/dashboard/schedules?tab=channel');
        fireEvent.click(screen.getByRole('tab', {name: 'Programmations'}));
        expect(routerMock.replace).toHaveBeenCalledWith('/dashboard/schedules?tab=schedules');
        expect(routerMock.replace).toHaveBeenCalledTimes(3);
    });
});
