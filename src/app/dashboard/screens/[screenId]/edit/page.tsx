import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { ScreenForm } from '@/components/screens/screen-form';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { appendReturnTo } from '@/lib/return-to';

type ScreenEditPageProps = {
    params: Promise<{ screenId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

export default async function Page({params, searchParams}: ScreenEditPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('update', 'Screen')) redirect('/dashboard');

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
                        {label: 'Écrans', href: '/dashboard/screens'},
                        {label: 'Modifier'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const [screen, channels] = await Promise.all([
        prisma.screen.findFirst({
            where: {
                id: screenId,
                organizationId,
            },
            select: {
                id: true,
                name: true,
                location: true,
                status: true,
                channelId: true,
                interactive: true,
                interactiveUrl: true,
                inactivityTimeoutSeconds: true,
            },
        }),
        prisma.channel.findMany({
            where: {organizationId},
            select: {id: true, name: true},
            orderBy: {name: 'asc'},
        }),
    ]);

    if (!screen) notFound();
    const detailHref = appendReturnTo(`/dashboard/screens/${screen.id}`, query.returnTo);

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Écrans', href: '/dashboard/screens'},
                    {label: screen.name, href: detailHref},
                    {label: screen.status === 'PENDING' ? 'Valider' : 'Modifier'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <ScreenForm
                    mode={screen.status === 'PENDING' ? 'approve' : 'edit'}
                    screenId={screen.id}
                    channels={channels}
                    cancelHref={detailHref}
                    defaultValues={{
                        name: screen.name,
                        location: screen.location,
                        channelId: screen.channelId ?? '',
                        interactive: screen.interactive,
                        interactiveUrl: screen.interactiveUrl ?? '',
                        inactivityTimeoutSeconds: screen.inactivityTimeoutSeconds ?? undefined,
                    }}
                />
            </div>
        </>
    );
}
