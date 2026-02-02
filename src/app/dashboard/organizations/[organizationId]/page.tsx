import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationDeleteCard } from '@/components/organizations/organization-delete-card';
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
import { formatDate } from '@/lib/utils';

type OrganizationDetailsPageProps = {
    params: Promise<{ organizationId: string }>
};

export default async function Page({params}: OrganizationDetailsPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('view', 'SuperAdminSection')) redirect('/dashboard');

    const {organizationId} = await params;

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
                    widgetInstances: true,
                },
            },
        },
    });

    if (!organization) {
        notFound();
    }

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
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold break-all max-w-120">
                            {organization.name}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Dernière mise à jour le {formatDate(organization.updatedAt)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline">
                            <Link href="/dashboard/organizations">Retour</Link>
                        </Button>
                        <Button asChild>
                            <Link href={`/dashboard/organizations/${organization.id}/edit`}>
                                Modifier
                            </Link>
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Présentation</CardTitle>
                        <CardDescription>
                            Informations principales de l&apos;organisation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-muted-foreground text-xs uppercase">Description</p>
                            <p className="text-sm break-all">{organization.description}</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div>
                                <p className="text-muted-foreground text-xs uppercase">Créée le</p>
                                <p className="text-sm">{formatDate(organization.createdAt)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs uppercase">ID</p>
                                <p className="text-sm break-all">{organization.id}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader>
                            <CardDescription>Utilisateurs</CardDescription>
                            <CardTitle>{organization._count.users}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Écrans</CardDescription>
                            <CardTitle>{organization._count.screens}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Canaux</CardDescription>
                            <CardTitle>{organization._count.channels}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Playlists</CardDescription>
                            <CardTitle>{organization._count.playlists}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <OrganizationDeleteCard
                    organizationId={organization.id}
                    organizationName={organization.name}
                    counts={{
                        users: organization._count.users,
                        screens: organization._count.screens,
                        channels: organization._count.channels,
                        playlists: organization._count.playlists,
                        displayTemplates: organization._count.displayTemplates,
                        widgetInstances: organization._count.widgetInstances,
                    }}
                />
            </div>
        </>
    );
}
