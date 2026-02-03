import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { AdminForm } from '@/components/admins/admin-form';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';

export default async function Page() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('view', 'SuperAdminSection')) redirect('/dashboard');

    const organizations = await prisma.organization.findMany({
        select: {id: true, name: true},
        orderBy: {name: 'asc'},
    });

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Administrateurs', href: '/dashboard/administrators'},
                    {label: 'Créer'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <AdminForm
                    mode="create"
                    organizations={organizations}
                    cancelHref="/dashboard/administrators"
                />
            </div>
        </>
    );
}
