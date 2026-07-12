import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { MediaForm } from '@/components/media/media-form';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { resolveReturnTo } from '@/lib/return-to';

type MediaNewPageProps = {
    searchParams: Promise<{ returnTo?: string }>;
};

export default async function Page({searchParams}: MediaNewPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('create', 'MediaItem')) redirect('/dashboard');

    const query = await searchParams;
    const cancelHref = resolveReturnTo(query.returnTo, '/dashboard/media');
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
                        {label: 'Médias', href: '/dashboard/media'},
                        {label: 'Créer'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Médias', href: '/dashboard/media'},
                    {label: 'Créer'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <MediaForm
                    mode="create"
                    organizationId={organizationId}
                    cancelHref={cancelHref}
                />
            </div>
        </>
    );
}
