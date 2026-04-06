import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { AdminActionsCard } from '@/components/admins/admin-actions-card';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { appendReturnTo, resolveReturnTo } from '@/lib/return-to';
import { formatDate } from '@/lib/utils';
import { getRoleLabel } from '@/lib/roles';
import { isAdminRole } from '@/schemas/admin-schema';


type AdminDetailsPageProps = {
    params: Promise<{ adminId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

export default async function Page({params, searchParams}: AdminDetailsPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('view', 'SuperAdminSection')) redirect('/dashboard');

    const [{adminId}, query] = await Promise.all([params, searchParams]);

    if (!adminId) {
        notFound();
    }

    const admin = await prisma.user.findUnique({
        where: {id: adminId},
        select: {
            id: true,
            fullName: true,
            email: true,
            description: true,
            role: true,
            active: true,
            createdAt: true,
            updatedAt: true,
            organization: {select: {name: true}},
        },
    });

    if (!admin || !isAdminRole(admin.role)) {
        notFound();
    }
    const returnHref = resolveReturnTo(query.returnTo, '/dashboard/administrators');
    const editHref = appendReturnTo(`/dashboard/administrators/${admin.id}/edit`, query.returnTo);

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Administrateurs', href: '/dashboard/administrators'},
                    {label: admin.fullName},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold break-all max-w-120">
                            {admin.fullName}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Dernière mise à jour le {formatDate(admin.updatedAt)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline">
                            <Link href={returnHref}>Retour</Link>
                        </Button>
                        <Button asChild>
                            <Link href={editHref}>
                                Modifier
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Informations</CardTitle>
                            <CardDescription>
                                Informations principales de l&apos;administrateur.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground text-xs uppercase">Email</p>
                                <p className="break-all">{admin.email}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs uppercase">Description</p>
                                <p className="break-all">{admin.description}</p>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <p className="text-muted-foreground text-xs uppercase">Rôle</p>
                                    <p>{getRoleLabel(admin.role)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs uppercase">Organisation</p>
                                    <p className="truncate max-w-50">{admin.organization?.name ?? 'Aucune'}</p>
                                </div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <p className="text-muted-foreground text-xs uppercase">Statut</p>
                                    <p className={admin.active ? 'text-emerald-600' : 'text-muted-foreground'}>
                                        {admin.active ? 'Actif' : 'Inactif'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs uppercase">Créé le</p>
                                    <p>{formatDate(admin.createdAt)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <AdminActionsCard
                        adminId={admin.id}
                        adminName={admin.fullName}
                        isActive={admin.active}
                    />
                </div>
            </div>
        </>
    );
}
