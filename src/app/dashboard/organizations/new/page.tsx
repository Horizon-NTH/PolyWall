import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationForm } from '@/components/organizations/organization-form';
import { defineAbilityFor } from '@/lib/casl/ability';

export default async function Page() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('view', 'SuperAdminSection')) redirect('/dashboard');

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Organisations', href: '/dashboard/organizations'},
                    {label: 'Créer'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <OrganizationForm
                    mode="create"
                    cancelHref="/dashboard/organizations"
                />
            </div>
        </>
    );
}
