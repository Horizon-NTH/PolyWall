'use client';

import * as React from 'react';

import { ScheduleConflictsCard } from '@/components/schedules/schedule-conflicts-card';
import { SchedulesCalendar } from '@/components/schedules/schedules-calendar';
import { SchedulesTable } from '@/components/schedules/schedules-table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type ScheduleViewModel } from '@/lib/schedules/schedule-view-model';
import { type ScheduleConflict } from '@/lib/schedules/schedule-utils';

type SchedulePageTabsProps = {
    schedules: ScheduleViewModel[];
    canManage: boolean;
    conflicts: ScheduleConflict[];
    channelContent: React.ReactNode;
};

export function SchedulePageTabs({schedules, canManage, conflicts, channelContent}: SchedulePageTabsProps) {
    const [activeTab, setActiveTab] = React.useState<'schedules' | 'calendar' | 'channel'>('schedules');

    return (
        <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'schedules' | 'calendar' | 'channel')}
            className="gap-4"
        >
            <TabsList>
                <TabsTrigger value="schedules" className="gap-2">
                    Programmations
                    {conflicts.length > 0 ? <Badge variant="destructive">{conflicts.length}</Badge> : null}
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2">
                    Planning
                    {conflicts.length > 0 ? <Badge variant="destructive">{conflicts.length}</Badge> : null}
                </TabsTrigger>
                <TabsTrigger value="channel">Canal</TabsTrigger>
            </TabsList>
            <TabsContent className={activeTab === 'schedules' ? 'block' : 'hidden'}>
                <div className="flex flex-col gap-4">
                    {conflicts.length > 0 ? <ScheduleConflictsCard conflicts={conflicts} /> : null}
                    <SchedulesTable data={schedules} canManage={canManage} />
                </div>
            </TabsContent>
            <TabsContent className={activeTab === 'calendar' ? 'block' : 'hidden'}>
                <div className="flex flex-col gap-4">
                    {conflicts.length > 0 ? <ScheduleConflictsCard conflicts={conflicts} /> : null}
                    <SchedulesCalendar schedules={schedules} />
                </div>
            </TabsContent>
            <TabsContent className={activeTab === 'channel' ? 'block' : 'hidden'}>
                {channelContent}
            </TabsContent>
        </Tabs>
    );
}
