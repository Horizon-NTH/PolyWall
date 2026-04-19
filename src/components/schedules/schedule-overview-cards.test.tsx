import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ScheduleOverviewCards } from '@/components/schedules/schedule-overview-cards';

describe('ScheduleOverviewCards', () => {
    it('renders channel overview values', () => {
        render(
            <ScheduleOverviewCards
                channelName="Hall"
                displayTemplateName="Template principal"
                screensCount={7}
                schedulesCount={4}
            />,
        );

        expect(screen.getByText('Canal')).toBeInTheDocument();
        expect(screen.getByText('Hall')).toBeInTheDocument();
        expect(screen.getByText('Template principal')).toBeInTheDocument();
        expect(screen.getByText('7')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
    });
});
