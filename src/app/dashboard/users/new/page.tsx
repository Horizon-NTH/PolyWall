import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { UserForm } from '@/components/users/user-form';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';

export default async function Page() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    const canView =
        ability.can('view', 'OrganizationAdminSection') ||
        ability.can('view', 'SuperAdminSection');

    if (!canView) redirect('/dashboard');

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
                        {label: 'Utilisateurs', href: '/dashboard/users'},
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
                    {label: 'Utilisateurs', href: '/dashboard/users'},
                    {label: 'Créer'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <UserForm
                    mode="create"
                    cancelHref="/dashboard/users"
                />
            </div>
        </>
    );
}
