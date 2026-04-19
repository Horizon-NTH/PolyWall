import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationForm } from '@/components/organizations/organization-form';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { appendReturnTo } from '@/lib/return-to';

type OrganizationEditPageProps = {
    params: Promise<{ organizationId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

export default async function Page({params, searchParams}: OrganizationEditPageProps) {
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
        },
    });

    if (!organization) {
        notFound();
    }
    const detailHref = appendReturnTo(`/dashboard/organizations/${organization.id}`, query.returnTo);

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Organisations', href: '/dashboard/organizations'},
                    {label: organization.name, href: detailHref},
                    {label: 'Modifier'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <OrganizationForm
                    mode="edit"
                    organizationId={organization.id}
                    cancelHref={detailHref}
                    defaultValues={{
                        name: organization.name,
                        description: organization.description,
                    }}
                />
            </div>
        </>
    );
}
