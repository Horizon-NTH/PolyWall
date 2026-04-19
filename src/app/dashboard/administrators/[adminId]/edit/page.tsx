import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { AdminForm } from '@/components/admins/admin-form';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { appendReturnTo } from '@/lib/return-to';
import { isAdminRole } from '@/schemas/admin-schema';

type AdminEditPageProps = {
    params: Promise<{ adminId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

export default async function Page({params, searchParams}: AdminEditPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('view', 'SuperAdminSection')) redirect('/dashboard');

    const [{adminId}, query] = await Promise.all([params, searchParams]);

    if (!adminId) {
        notFound();
    }

    const [admin, organizations] = await Promise.all([
        prisma.user.findUnique({
            where: {id: adminId},
            select: {
                id: true,
                fullName: true,
                email: true,
                description: true,
                role: true,
                organizationId: true,
                active: true,
            },
        }),
        prisma.organization.findMany({
            select: {id: true, name: true},
            orderBy: {name: 'asc'},
        }),
    ]);

    if (!admin || !isAdminRole(admin.role)) {
        notFound();
    }
    const detailHref = appendReturnTo(`/dashboard/administrators/${admin.id}`, query.returnTo);

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Administrateurs', href: '/dashboard/administrators'},
                    {label: admin.fullName, href: detailHref},
                    {label: 'Modifier'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <AdminForm
                    mode="edit"
                    adminId={admin.id}
                    organizations={organizations}
                    cancelHref={detailHref}
                    defaultValues={{
                        fullName: admin.fullName,
                        email: admin.email,
                        description: admin.description,
                        role: admin.role,
                        organizationId: admin.organizationId ?? null,
                        active: admin.active,
                    }}
                />
            </div>
        </>
    );
}
