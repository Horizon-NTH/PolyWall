import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ChannelActionsCard } from '@/components/channels/channel-actions-card';
import { ChannelSummaryCard } from '@/components/channels/channel-summary-card';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { Button } from '@/components/ui/button';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { appendReturnTo, resolveReturnTo } from '@/lib/return-to';
import { formatDate } from '@/lib/utils';

type ChannelDetailsPageProps = {
    params: Promise<{ channelId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

export default async function Page({params, searchParams}: ChannelDetailsPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('read', 'Channel')) redirect('/dashboard');

    const [{channelId}, query] = await Promise.all([params, searchParams]);
    if (!channelId) notFound();

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
                        {label: 'Canaux'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const channel = await prisma.channel.findFirst({
        where: {
            id: channelId,
            organizationId,
        },
        select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            displayTemplate: {
                select: {
                    id: true,
                    name: true,
                },
            },
            _count: {
                select: {
                    screens: true,
                    schedules: true,
                },
            },
        },
    });

    if (!channel) notFound();

    const canUpdate = ability.can('update', 'Channel');
    const canDelete = ability.can('delete', 'Channel');
    const returnHref = resolveReturnTo(query.returnTo, '/dashboard/channels');
    const editHref = appendReturnTo(`/dashboard/channels/${channel.id}/edit`, query.returnTo);

    const reassignOptions = canDelete
        ? await prisma.channel.findMany({
            where: {
                organizationId,
                id: {
                    not: channel.id,
                },
            },
            select: {
                id: true,
                name: true,
            },
            orderBy: {name: 'asc'},
        })
        : [];

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Canaux', href: '/dashboard/channels'},
                    {label: channel.name},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold break-all max-w-140">{channel.name}</h1>
                        <p className="text-muted-foreground text-sm">
                            Dernière mise à jour le {formatDate(channel.updatedAt)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline">
                            <Link href={returnHref}>Retour</Link>
                        </Button>
                        {canUpdate ? (
                            <Button asChild>
                                <Link href={editHref}>Modifier infos</Link>
                            </Button>
                        ) : null}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="grid gap-4 lg:col-span-2">
                        <ChannelSummaryCard
                            description={channel.description}
                            displayTemplateName={channel.displayTemplate.name}
                            screensCount={channel._count.screens}
                            schedulesCount={channel._count.schedules}
                            createdAt={channel.createdAt.toISOString()}
                            updatedAt={channel.updatedAt.toISOString()}
                        />
                    </div>

                    {canDelete ? (
                        <ChannelActionsCard
                            channelId={channel.id}
                            channelName={channel.name}
                            screensCount={channel._count.screens}
                            reassignOptions={reassignOptions}
                        />
                    ) : null}
                </div>
            </div>
        </>
    );
}
