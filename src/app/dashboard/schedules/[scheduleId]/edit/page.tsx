import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { ScheduleForm } from '@/components/schedules/schedule-form';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { ScheduleType } from '@/generated/prisma/enums';
import { getScheduleByIdInOrganization, getScheduleFormOptions } from '@/lib/schedules/schedule-queries';
import { getScheduleFormInitialDate, getScheduleFormInitialTime } from '@/lib/schedules/schedule-utils';

type ScheduleEditPageProps = {
    params: Promise<{ scheduleId: string }>;
};

export default async function Page({params}: ScheduleEditPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('update', 'PlaylistSchedule')) redirect('/dashboard');

    const {scheduleId} = await params;
    if (!scheduleId) notFound();

    const organizationId = session.user.organizationId;
    if (!organizationId) {
        const organizations = await prisma.organization.findMany({
            select: {id: true, name: true},
            orderBy: {name: 'asc'},
        });

        return (
            <>
                <DashboardHeader
                    items={[
                        {label: 'Tableau de bord', href: '/dashboard'},
                        {label: 'Planification', href: '/dashboard/schedules'},
                        {label: 'Modifier'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const [schedule, {channels, playlists}] = await Promise.all([
        getScheduleByIdInOrganization(scheduleId, organizationId),
        getScheduleFormOptions(organizationId),
    ]);

    const firstSlot = schedule.timeSlots[0] ?? null;

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Planification', href: `/dashboard/schedules?channelId=${schedule.channelId}`},
                    {label: 'Modifier'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <ScheduleForm
                    mode="edit"
                    scheduleId={schedule.id}
                    channels={channels}
                    playlists={playlists}
                    cancelHref={`/dashboard/schedules/${schedule.id}`}
                    defaultValues={{
                        type: schedule.type,
                        channelId: schedule.channelId,
                        playlistId: schedule.playlistId,
                        active: schedule.active,
                        date: schedule.type === ScheduleType.EVENT ? getScheduleFormInitialDate(schedule.startDate) : '',
                        daysOfWeek: schedule.type === ScheduleType.RECURRING
                            ? schedule.timeSlots.map((slot) => slot.dayOfWeek)
                            : [],
                        startTime: getScheduleFormInitialTime(firstSlot?.startTime),
                        endMode: 'time',
                        endTime: getScheduleFormInitialTime(firstSlot?.endTime),
                    }}
                />
            </div>
        </>
    );
}
