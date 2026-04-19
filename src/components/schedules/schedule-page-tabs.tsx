'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { SchedulesCalendar } from '@/components/schedules/schedules-calendar';
import { SchedulesTable } from '@/components/schedules/schedules-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { appendQueryParamToHref } from '@/lib/return-to';
import { type ScheduleViewModel } from '@/lib/schedules/schedule-view-model';

type SchedulePageTabsProps = {
    schedules: ScheduleViewModel[];
    canManage: boolean;
    channelContent: React.ReactNode;
};

const TAB_PARAM = 'tab';

type ScheduleTabValue = 'schedules' | 'calendar' | 'channel';

function parseTabValue(value: string | null): ScheduleTabValue {
    if (value === 'calendar' || value === 'channel') {
        return value;
    }

    return 'schedules';
}

export function SchedulePageTabs({schedules, canManage, channelContent}: SchedulePageTabsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const initialTab = React.useMemo(() => parseTabValue(searchParams.get(TAB_PARAM)), [searchParams]);
    const [activeTab, setActiveTab] = React.useState<ScheduleTabValue>(initialTab);

    React.useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const currentHref = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const tabbedReturnTo = React.useMemo(
        () => appendQueryParamToHref(currentHref, TAB_PARAM, activeTab),
        [activeTab, currentHref],
    );

    const handleTabChange = (value: string) => {
        const nextTab = parseTabValue(value);
        setActiveTab(nextTab);

        const nextHref = appendQueryParamToHref(currentHref, TAB_PARAM, nextTab);

        if (nextHref !== currentHref) {
            router.replace(nextHref);
        }
    };

    return (
        <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="gap-4"
        >
            <TabsList>
                <TabsTrigger value="schedules">Programmations</TabsTrigger>
                <TabsTrigger value="calendar">Planning</TabsTrigger>
                <TabsTrigger value="channel">Canal</TabsTrigger>
            </TabsList>
            <TabsContent className={activeTab === 'schedules' ? 'block' : 'hidden'}>
                <SchedulesTable data={schedules} canManage={canManage} returnTo={tabbedReturnTo} />
            </TabsContent>
            <TabsContent className={activeTab === 'calendar' ? 'block' : 'hidden'}>
                <SchedulesCalendar schedules={schedules} returnTo={tabbedReturnTo} />
            </TabsContent>
            <TabsContent className={activeTab === 'channel' ? 'block' : 'hidden'}>
                {channelContent}
            </TabsContent>
        </Tabs>
    );
}
