import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { ScreenActionsCard } from '@/components/screens/screen-actions-card';
import { ScreenSummaryCard } from '@/components/screens/screen-summary-card';
import { Button } from '@/components/ui/button';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { appendReturnTo, resolveReturnTo } from '@/lib/return-to';
import { formatDate } from '@/lib/utils';

type ScreenDetailsPageProps = {
    params: Promise<{ screenId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

export default async function Page({params, searchParams}: ScreenDetailsPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('read', 'Screen')) redirect('/dashboard');

    const [{screenId}, query] = await Promise.all([params, searchParams]);
    if (!screenId) notFound();

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
                        {label: 'Écrans'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const screen = await prisma.screen.findFirst({
        where: {
            id: screenId,
            organizationId,
        },
        select: {
            id: true,
            name: true,
            location: true,
            status: true,
            deviceId: true,
            interactive: true,
            interactiveUrl: true,
            inactivityTimeoutSeconds: true,
            approvedAt: true,
            revokedAt: true,
            lastSeenAt: true,
            createdAt: true,
            updatedAt: true,
            channel: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    if (!screen) notFound();

    const canManage = ability.can('update', 'Screen');
    const returnHref = resolveReturnTo(query.returnTo, '/dashboard/screens');
    const editHref = appendReturnTo(`/dashboard/screens/${screen.id}/edit`, query.returnTo);

    const channels = canManage
        ? await prisma.channel.findMany({
            where: {organizationId},
            select: {id: true, name: true},
            orderBy: {name: 'asc'},
        })
        : [];

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Écrans', href: '/dashboard/screens'},
                    {label: screen.name},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold break-all max-w-140">{screen.name}</h1>
                        <p className="text-muted-foreground text-sm">
                            Dernière mise à jour le {formatDate(screen.updatedAt)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline">
                            <Link href={returnHref}>Retour</Link>
                        </Button>
                        {canManage ? (
                            <Button asChild>
                                <Link href={editHref}>
                                    {screen.status === 'PENDING' ? 'Valider' : 'Modifier'}
                                </Link>
                            </Button>
                        ) : null}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="grid gap-4 lg:col-span-2">
                        <ScreenSummaryCard
                            status={screen.status}
                            deviceId={screen.deviceId}
                            location={screen.location}
                            channelName={screen.channel?.name ?? null}
                            interactive={screen.interactive}
                            interactiveUrl={screen.interactiveUrl}
                            inactivityTimeoutSeconds={screen.inactivityTimeoutSeconds}
                            createdAt={screen.createdAt.toISOString()}
                            updatedAt={screen.updatedAt.toISOString()}
                            approvedAt={screen.approvedAt?.toISOString() ?? null}
                            revokedAt={screen.revokedAt?.toISOString() ?? null}
                            lastSeenAt={screen.lastSeenAt?.toISOString() ?? null}
                        />
                    </div>
                    {canManage ? (
                        <ScreenActionsCard
                            screenId={screen.id}
                            screenName={screen.name}
                            status={screen.status}
                            channels={channels}
                        />
                    ) : null}
                </div>
            </div>
        </>
    );
}
