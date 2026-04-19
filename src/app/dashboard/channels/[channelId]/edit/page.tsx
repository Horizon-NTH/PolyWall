import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ChannelForm } from '@/components/channels/channel-form';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { appendReturnTo } from '@/lib/return-to';

type ChannelEditPageProps = {
    params: Promise<{ channelId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

export default async function Page({params, searchParams}: ChannelEditPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('update', 'Channel')) redirect('/dashboard');

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
                        {label: 'Canaux', href: '/dashboard/channels'},
                        {label: 'Modifier'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const [channel, templates] = await Promise.all([
        prisma.channel.findFirst({
            where: {
                id: channelId,
                organizationId,
            },
            select: {
                id: true,
                name: true,
                description: true,
                displayTemplateId: true,
            },
        }),
        prisma.displayTemplate.findMany({
            where: {
                OR: [{organizationId: null}, {organizationId}],
            },
            select: {
                id: true,
                name: true,
                organizationId: true,
            },
            orderBy: [{organizationId: 'asc'}, {name: 'asc'}],
        }),
    ]);

    if (!channel) notFound();
    const detailHref = appendReturnTo(`/dashboard/channels/${channel.id}`, query.returnTo);

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Canaux', href: '/dashboard/channels'},
                    {label: channel.name, href: detailHref},
                    {label: 'Modifier'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <ChannelForm
                    mode="edit"
                    channelId={channel.id}
                    templates={templates}
                    cancelHref={detailHref}
                    defaultValues={{
                        name: channel.name,
                        description: channel.description,
                        displayTemplateId: channel.displayTemplateId,
                    }}
                />
            </div>
        </>
    );
}
