import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationOverview } from '@/components/organizations/organization-overview';
import { OrganizationDeleteCard } from '@/components/organizations/organization-delete-card';
import { Button } from '@/components/ui/button';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { appendReturnTo, resolveReturnTo } from '@/lib/return-to';

type OrganizationDetailsPageProps = {
    params: Promise<{ organizationId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

export default async function Page({params, searchParams}: OrganizationDetailsPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('view', 'SuperAdminSection')) redirect('/dashboard');

    const [{organizationId}, query] = await Promise.all([params, searchParams]);

    if (!organizationId) {
        notFound();
    }

    const organization = await prisma.organization.findUnique({
        where: {id: organizationId},
        select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            _count: {
                select: {
                    users: true,
                    screens: true,
                    channels: true,
                    playlists: true,
                    displayTemplates: true,
                },
            },
        },
    });

    if (!organization) {
        notFound();
    }
    const returnHref = resolveReturnTo(query.returnTo, '/dashboard/organizations');
    const editHref = appendReturnTo(`/dashboard/organizations/${organization.id}/edit`, query.returnTo);

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Organisations', href: '/dashboard/organizations'},
                    {label: organization.name},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <OrganizationOverview
                    organization={organization}
                    actions={
                        <>
                            <Button asChild variant="outline">
                                <Link href={returnHref}>Retour</Link>
                            </Button>
                            <Button asChild>
                                <Link href={editHref}>
                                    Modifier
                                </Link>
                            </Button>
                        </>
                    }
                />

                <OrganizationDeleteCard
                    organizationId={organization.id}
                    organizationName={organization.name}
                    counts={{
                        users: organization._count.users,
                        screens: organization._count.screens,
                        channels: organization._count.channels,
                        playlists: organization._count.playlists,
                        displayTemplates: organization._count.displayTemplates,
                    }}
                />
            </div>
        </>
    );
}
