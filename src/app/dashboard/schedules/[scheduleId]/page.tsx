import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { ScheduleActionsCard } from '@/components/schedules/schedule-actions-card';
import { ScheduleSummaryCard } from '@/components/schedules/schedule-summary-card';
import { Button } from '@/components/ui/button';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { appendReturnTo, resolveReturnTo } from '@/lib/return-to';
import { getScheduleByIdInOrganization } from '@/lib/schedules/schedule-queries';
import { toScheduleViewModel } from '@/lib/schedules/schedule-view-model';
import { formatDate } from '@/lib/utils';

type ScheduleDetailsPageProps = {
    params: Promise<{ scheduleId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

export default async function Page({params, searchParams}: ScheduleDetailsPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('read', 'PlaylistSchedule')) redirect('/dashboard');

    const [{scheduleId}, query] = await Promise.all([params, searchParams]);
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
                        {label: 'Planification'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const schedule = toScheduleViewModel(await getScheduleByIdInOrganization(scheduleId, organizationId));
    const canManage = ability.can('update', 'PlaylistSchedule');
    const returnHref = resolveReturnTo(query.returnTo, `/dashboard/schedules?channelId=${schedule.channelId}`);
    const editHref = appendReturnTo(`/dashboard/schedules/${schedule.id}/edit`, query.returnTo);

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Planification', href: returnHref},
                    {label: schedule.playlistName},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold break-all max-w-140">{schedule.playlistName}</h1>
                        <p className="text-muted-foreground text-sm">
                            Dernière mise à jour le {formatDate(new Date(schedule.updatedAt))}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline">
                            <Link href={returnHref}>Retour</Link>
                        </Button>
                        {canManage ? (
                            <Button asChild>
                                <Link href={editHref}>Modifier</Link>
                            </Button>
                        ) : null}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="grid gap-4 lg:col-span-2">
                        <ScheduleSummaryCard schedule={schedule} />
                    </div>

                    {canManage ? (
                        <ScheduleActionsCard
                            scheduleId={schedule.id}
                            scheduleLabel={schedule.playlistName}
                            returnHref={returnHref}
                        />
                    ) : null}
                </div>
            </div>
        </>
    );
}
