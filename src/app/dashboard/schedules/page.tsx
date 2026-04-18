import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { ChannelScheduleSelector } from '@/components/schedules/channel-schedule-selector';
import { ScheduleConflictsCard } from '@/components/schedules/schedule-conflicts-card';
import { ScheduleDefaultCard } from '@/components/schedules/schedule-default-card';
import { ScheduleLivePreviewCard } from '@/components/schedules/schedule-live-preview-card';
import { ScheduleOverviewCards } from '@/components/schedules/schedule-overview-cards';
import { SchedulePageTabs } from '@/components/schedules/schedule-page-tabs';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from '@/components/ui/empty';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { getChannelSchedulesOverview, getOrganizationChannels } from '@/lib/schedules/schedule-queries';

type SchedulesPageProps = {
    searchParams: Promise<{
        channelId?: string;
    }>;
};

export default async function Page({searchParams}: SchedulesPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('read', 'PlaylistSchedule')) redirect('/dashboard');

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

    const channels = await getOrganizationChannels(organizationId);
    if (channels.length === 0) {
        return (
            <>
                <DashboardHeader
                    items={[
                        {label: 'Tableau de bord', href: '/dashboard'},
                        {label: 'Planification'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <Empty>
                        <EmptyHeader>
                            <EmptyTitle>Aucun canal disponible</EmptyTitle>
                            <EmptyDescription>
                                Créez d&apos;abord un canal avant de planifier vos playlists.
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            {ability.can('create', 'Channel') ? (
                                <Button asChild>
                                    <Link href="/dashboard/channels/new">Créer un canal</Link>
                                </Button>
                            ) : null}
                        </EmptyContent>
                    </Empty>
                </div>
            </>
        );
    }

    const resolvedSearchParams = await searchParams;
    const selectedChannelId = resolvedSearchParams.channelId ?? channels[0]!.id;

    if (!resolvedSearchParams.channelId) {
        redirect(`/dashboard/schedules?channelId=${selectedChannelId}`);
    }

    const selectedChannel = channels.find((channel) => channel.id === selectedChannelId) ?? channels[0]!;
    const {
        channel,
        defaultSchedule,
        defaultSchedulePlaylist,
        plannedScheduleRows,
        conflicts,
    } = await getChannelSchedulesOverview(organizationId, selectedChannel.id);

    const canManage = ability.can('create', 'PlaylistSchedule');

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Planification'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <ChannelScheduleSelector channels={channels} selectedChannelId={selectedChannel.id} />
                    {canManage ? (
                        <div className="flex flex-wrap items-center gap-2">
                            {!defaultSchedule ? (
                                <Button asChild variant="outline">
                                    <Link href={`/dashboard/schedules/new?channelId=${selectedChannel.id}&type=DEFAULT`}>
                                        Définir la playlist par défaut
                                    </Link>
                                </Button>
                            ) : null}
                            <Button asChild>
                                <Link href={`/dashboard/schedules/new?channelId=${selectedChannel.id}`}>
                                    Nouvelle programmation
                                </Link>
                            </Button>
                        </div>
                    ) : null}
                </div>

                <SchedulePageTabs
                    schedules={plannedScheduleRows}
                    canManage={canManage}
                    conflicts={conflicts}
                    channelContent={(
                        <div className="flex flex-col gap-4">
                            <ScheduleOverviewCards
                                channelName={channel.name}
                                displayTemplateName={channel.displayTemplate.name}
                                screensCount={channel._count.screens}
                                schedulesCount={plannedScheduleRows.filter((schedule) => schedule.active).length}
                            />

                            <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                                <ScheduleLivePreviewCard />
                                <ScheduleDefaultCard
                                    channelId={selectedChannel.id}
                                    defaultSchedule={defaultSchedule}
                                    defaultPlaylist={defaultSchedulePlaylist}
                                />
                            </div>

                            <ScheduleConflictsCard conflicts={conflicts} />
                        </div>
                    )}
                />
            </div>
        </>
    );
}
