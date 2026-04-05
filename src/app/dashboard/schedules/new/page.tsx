import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { ScheduleForm } from '@/components/schedules/schedule-form';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { ScheduleType } from '@/generated/prisma/enums';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { getScheduleFormOptions } from '@/lib/schedules/schedule-queries';

type ScheduleNewPageProps = {
    searchParams: Promise<{
        channelId?: string;
        type?: ScheduleType;
    }>;
};

export default async function Page({searchParams}: ScheduleNewPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('create', 'PlaylistSchedule')) redirect('/dashboard');

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
                        {label: 'Nouvelle programmation'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const {channels, playlists} = await getScheduleFormOptions(organizationId);
    if (channels.length === 0 || playlists.length === 0) {
        return (
            <>
                <DashboardHeader
                    items={[
                        {label: 'Tableau de bord', href: '/dashboard'},
                        {label: 'Planification', href: '/dashboard/schedules'},
                        {label: 'Nouvelle programmation'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <Empty>
                        <EmptyHeader>
                            <EmptyTitle>Configuration incomplète</EmptyTitle>
                            <EmptyDescription>
                                Vous devez disposer d&apos;au moins un canal et une playlist pour créer une
                                programmation.
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent className="flex gap-2">
                            <Button asChild variant="outline">
                                <Link href="/dashboard/channels">Voir les canaux</Link>
                            </Button>
                            <Button asChild>
                                <Link href="/dashboard/playlists">Voir les playlists</Link>
                            </Button>
                        </EmptyContent>
                    </Empty>
                </div>
            </>
        );
    }

    const resolvedSearchParams = await searchParams;

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Planification', href: '/dashboard/schedules'},
                    {label: 'Nouvelle programmation'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <ScheduleForm
                    mode="create"
                    channels={channels}
                    playlists={playlists}
                    cancelHref={resolvedSearchParams.channelId
                        ? `/dashboard/schedules?channelId=${resolvedSearchParams.channelId}`
                        : '/dashboard/schedules'}
                    defaultValues={{
                        channelId: resolvedSearchParams.channelId ?? channels[0]?.id ?? '',
                        type: resolvedSearchParams.type ?? ScheduleType.RECURRING,
                    }}
                />
            </div>
        </>
    );
}
