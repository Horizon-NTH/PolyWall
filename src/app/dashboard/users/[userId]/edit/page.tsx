import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { UserForm } from '@/components/users/user-form';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { UserRole } from '@/generated/prisma/enums';

type UserEditPageProps = {
    params: Promise<{ userId: string }>;
};

export default async function Page({params}: UserEditPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    const canView =
        ability.can('view', 'OrganizationAdminSection') ||
        ability.can('view', 'SuperAdminSection');

    if (!canView) redirect('/dashboard');

    const {userId} = await params;

    if (!userId) {
        notFound();
    }

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
                        {label: 'Modifier'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const user = await prisma.user.findUnique({
        where: {id: userId},
        select: {
            id: true,
            fullName: true,
            email: true,
            description: true,
            role: true,
            organizationId: true,
            active: true,
        },
    });

    if (!user || user.role !== UserRole.CONTENT_MANAGER || user.organizationId !== organizationId) {
        notFound();
    }

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Utilisateurs', href: '/dashboard/users'},
                    {label: user.fullName, href: `/dashboard/users/${user.id}`},
                    {label: 'Modifier'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <UserForm
                    mode="edit"
                    userId={user.id}
                    cancelHref={`/dashboard/users/${user.id}`}
                    defaultValues={{
                        fullName: user.fullName,
                        email: user.email,
                        description: user.description,
                        active: user.active,
                    }}
                />
            </div>
        </>
    );
}
