import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { UserActionsCard } from '@/components/users/user-actions-card';
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
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { UserRole } from '@/generated/prisma/enums';

type UserDetailsPageProps = {
    params: Promise<{ userId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

export default async function Page({params, searchParams}: UserDetailsPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    const canView =
        ability.can('view', 'OrganizationAdminSection') ||
        ability.can('view', 'SuperAdminSection');

    if (!canView) redirect('/dashboard');

    const [{userId}, query] = await Promise.all([params, searchParams]);

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
                        {label: 'Utilisateurs'},
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
            active: true,
            createdAt: true,
            updatedAt: true,
            organization: {select: {name: true}},
            organizationId: true,
        },
    });

    if (!user || user.role !== UserRole.CONTENT_MANAGER || user.organizationId !== organizationId) {
        notFound();
    }
    const returnHref = resolveReturnTo(query.returnTo, '/dashboard/users');
    const editHref = appendReturnTo(`/dashboard/users/${user.id}/edit`, query.returnTo);

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Utilisateurs', href: '/dashboard/users'},
                    {label: user.fullName},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold break-all max-w-120">
                            {user.fullName}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Dernière mise à jour le {formatDate(user.updatedAt)}
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
                                Informations principales de l&apos;utilisateur.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground text-xs uppercase">Email</p>
                                <p className="break-all">{user.email}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs uppercase">Description</p>
                                <p className="break-all">{user.description}</p>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <p className="text-muted-foreground text-xs uppercase">Rôle</p>
                                    <p>{getRoleLabel(user.role)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs uppercase">Organisation</p>
                                    <p className="truncate max-w-50">{user.organization?.name ?? 'Aucune'}</p>
                                </div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <p className="text-muted-foreground text-xs uppercase">Statut</p>
                                    <p className={user.active ? 'text-emerald-600' : 'text-muted-foreground'}>
                                        {user.active ? 'Actif' : 'Inactif'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs uppercase">Créé le</p>
                                    <p>{formatDate(user.createdAt)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <UserActionsCard
                        userId={user.id}
                        userName={user.fullName}
                        isActive={user.active}
                    />
                </div>
            </div>
        </>
    );
}
