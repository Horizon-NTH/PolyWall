import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DisplayTemplateActionsCard } from '@/components/display-templates/display-template-actions-card';
import { DisplayTemplatePreview } from '@/components/display-templates/display-template-preview';
import { DisplayTemplateSummaryCard } from '@/components/display-templates/display-template-summary-card';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { appendReturnTo, resolveReturnTo } from '@/lib/return-to';
import { formatDate } from '@/lib/utils';

type DisplayTemplateDetailsPageProps = {
    params: Promise<{ templateId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

export default async function Page({params, searchParams}: DisplayTemplateDetailsPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('read', 'DisplayTemplate')) redirect('/dashboard');

    const [{templateId}, query] = await Promise.all([params, searchParams]);
    if (!templateId) notFound();

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
                        {label: 'Modèles d’affichage'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const template = await prisma.displayTemplate.findFirst({
        where: {
            id: templateId,
            OR: [{organizationId: null}, {organizationId}],
        },
        select: {
            id: true,
            name: true,
            description: true,
            organizationId: true,
            resolutionX: true,
            resolutionY: true,
            createdAt: true,
            updatedAt: true,
            zones: {
                orderBy: {orderIndex: 'asc'},
                select: {
                    id: true,
                    name: true,
                    zoneType: true,
                    orderIndex: true,
                    positionX: true,
                    positionY: true,
                    width: true,
                    height: true,
                    widgetInstance: {
                        select: {
                            id: true,
                        },
                    },
                },
            },
            channels: {
                select: {
                    id: true,
                    name: true,
                },
                orderBy: {name: 'asc'},
            },
            _count: {
                select: {
                    channels: true,
                },
            },
        },
    });

    if (!template) notFound();

    const returnHref = resolveReturnTo(query.returnTo, '/dashboard/display-templates');
    const editHref = appendReturnTo(`/dashboard/display-templates/${template.id}/edit`, query.returnTo);
    const isOrganizationTemplate = template.organizationId === organizationId;
    const canUpdate = isOrganizationTemplate && ability.can('update', 'DisplayTemplate');
    const canDelete = isOrganizationTemplate && ability.can('delete', 'DisplayTemplate');
    const canDuplicate = ability.can('create', 'DisplayTemplate');
    const widgetsCount = template.zones.reduce((total, zone) => total + (zone.widgetInstance ? 1 : 0), 0);

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Modèles d’affichage', href: '/dashboard/display-templates'},
                    {label: template.name},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold break-all max-w-140">{template.name}</h1>
                        <p className="text-muted-foreground text-sm">
                            Dernière mise à jour le {formatDate(template.updatedAt)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline">
                            <Link href={returnHref}>Retour</Link>
                        </Button>
                        {canUpdate ? (
                            <Button asChild>
                                <Link href={editHref}>Modifier</Link>
                            </Button>
                        ) : null}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="grid gap-4 lg:col-span-2">
                        <DisplayTemplateSummaryCard
                            description={template.description}
                            scope={template.organizationId === null ? 'global' : 'organization'}
                            resolution={`${template.resolutionX}x${template.resolutionY}`}
                            zonesCount={template.zones.length}
                            widgetsCount={widgetsCount}
                            channelsCount={template._count.channels}
                            createdAt={template.createdAt.toISOString()}
                            updatedAt={template.updatedAt.toISOString()}
                        />
                        <Card>
                            <CardHeader>
                                <CardTitle>Aperçu de disposition</CardTitle>
                                <CardDescription>Disposition des zones sur la résolution de référence.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <DisplayTemplatePreview
                                    resolutionX={template.resolutionX}
                                    resolutionY={template.resolutionY}
                                    zones={template.zones}
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Canaux utilisant ce modèle</CardTitle>
                                <CardDescription>Les canaux bloquent la suppression du modèle.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-2 text-sm">
                                {template.channels.length > 0 ? (
                                    template.channels.map((channel) => (
                                        <Link
                                            key={channel.id}
                                            href={`/dashboard/channels/${channel.id}`}
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {channel.name}
                                        </Link>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground">Aucun canal.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    <DisplayTemplateActionsCard
                        templateId={template.id}
                        templateName={template.name}
                        channelsCount={template._count.channels}
                        canDuplicate={canDuplicate}
                        canDelete={canDelete}
                    />
                </div>
            </div>
        </>
    );
}
