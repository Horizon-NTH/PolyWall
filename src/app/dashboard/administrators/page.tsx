import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { AdminsTable, type AdminRow } from '@/components/admins/admins-table';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/generated/prisma/enums';

export default async function Page() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('view', 'SuperAdminSection')) redirect('/dashboard');

    const [admins, organizations] = await Promise.all([
        prisma.user.findMany({
            where: {
                role: {in: [UserRole.PLATFORM_SUPER_ADMIN, UserRole.ORGANIZATION_ADMIN]},
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                description: true,
                role: true,
                organizationId: true,
                active: true,
                createdAt: true,
                organization: {
                    select: {name: true},
                },
            },
            orderBy: [{fullName: 'asc'}],
        }),
        prisma.organization.findMany({
            select: {id: true, name: true},
            orderBy: {name: 'asc'},
        }),
    ]);

    const rows: AdminRow[] = admins.map((admin) => ({
        id: admin.id,
        fullName: admin.fullName,
        email: admin.email,
        description: admin.description,
        role: admin.role,
        organizationId: admin.organizationId ?? null,
        organizationName: admin.organization?.name ?? null,
        active: admin.active,
        createdAt: admin.createdAt.toISOString(),
    }));

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Administrateurs'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <AdminsTable data={rows} organizations={organizations} />
            </div>
        </>
    );
}
