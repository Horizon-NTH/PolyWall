import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ChannelScheduleSelector } from '@/components/schedules/channel-schedule-selector';
import { routerMock, setMockPathname, setMockSearchParams } from '@/test/mocks/next-navigation';

vi.mock('@/components/ui/select', () => ({
    Select: ({children, value, onValueChange}: {
        children: ReactNode;
        value?: string;
        onValueChange?: (value: string) => void;
    }) => (
        <select data-testid="channel-select" value={value} onChange={(event) => onValueChange?.(event.target.value)}>
            {children}
        </select>
    ),
    SelectTrigger: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectValue: ({placeholder}: { placeholder?: string }) => <option value="">{placeholder}</option>,
    SelectContent: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({value, children}: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

describe('ChannelScheduleSelector', () => {
    beforeEach(() => {
        setMockPathname('/dashboard/schedules');
        setMockSearchParams('tab=calendar');
    });

    it('updates channelId in query params and keeps existing params', () => {
        render(
            <ChannelScheduleSelector
                selectedChannelId="channel-1"
                channels={[
                    {id: 'channel-1', name: 'Hall'},
                    {id: 'channel-2', name: 'Restaurant'},
                ]}
            />, 
        );

        fireEvent.change(screen.getByTestId('channel-select'), {target: {value: 'channel-2'}});

        expect(routerMock.push).toHaveBeenCalledWith('/dashboard/schedules?tab=calendar&channelId=channel-2');
    });
});
