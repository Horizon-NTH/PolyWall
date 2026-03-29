import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { ScreenForm } from '@/components/screens/screen-form';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';

type ScreenEditPageProps = {
    params: Promise<{ screenId: string }>;
};

export default async function Page({params}: ScreenEditPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('update', 'Screen')) redirect('/dashboard');

    const {screenId} = await params;
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

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Écrans', href: '/dashboard/screens'},
                    {label: screen.name, href: `/dashboard/screens/${screen.id}`},
                    {label: screen.status === 'PENDING' ? 'Valider' : 'Modifier'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <ScreenForm
                    mode={screen.status === 'PENDING' ? 'approve' : 'edit'}
                    screenId={screen.id}
                    channels={channels}
                    cancelHref={`/dashboard/screens/${screen.id}`}
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
