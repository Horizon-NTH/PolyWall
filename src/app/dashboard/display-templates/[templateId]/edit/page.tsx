import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DisplayTemplateForm } from '@/components/display-templates/display-template-form';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { defineAbilityFor } from '@/lib/casl/ability';
import { asConfigurationRecord } from '@/lib/config/json-config';
import { prisma } from '@/lib/prisma';
import { appendReturnTo } from '@/lib/return-to';
import { findSupportedWidgetTypeOptions } from '@/lib/widgets/widget-type-queries';
import { type DisplayTemplateCreateValues } from '@/schemas/display-template-schema';

type DisplayTemplateEditPageProps = {
    params: Promise<{ templateId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

export default async function Page({params, searchParams}: DisplayTemplateEditPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('update', 'DisplayTemplate')) redirect('/dashboard');

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
                        {label: 'Modèles d’affichage', href: '/dashboard/display-templates'},
                        {label: 'Modifier'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const [template, widgetTypes] = await Promise.all([
        prisma.displayTemplate.findFirst({
            where: {
                id: templateId,
                organizationId,
            },
            select: {
                id: true,
                name: true,
                description: true,
                resolutionX: true,
                resolutionY: true,
                configurationJson: true,
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
                        configurationJson: true,
                        widgetInstance: {
                            select: {
                                id: true,
                                widgetTypeId: true,
                                active: true,
                                refreshPeriodSeconds: true,
                                configurationJson: true,
                            },
                        },
                    },
                },
            },
        }),
        findSupportedWidgetTypeOptions(),
    ]);

    if (!template) notFound();

    const detailHref = appendReturnTo(`/dashboard/display-templates/${template.id}`, query.returnTo);
    const defaultValues: DisplayTemplateCreateValues = {
        name: template.name,
        description: template.description,
        resolutionX: template.resolutionX,
        resolutionY: template.resolutionY,
        configurationJson: asConfigurationRecord(template.configurationJson),
        zones: template.zones.map((zone) => ({
            id: zone.id,
            name: zone.name,
            zoneType: zone.zoneType,
            orderIndex: zone.orderIndex,
            positionX: zone.positionX,
            positionY: zone.positionY,
            width: zone.width,
            height: zone.height,
            configurationJson: asConfigurationRecord(zone.configurationJson),
            widgetInstance: zone.widgetInstance
                ? {
                    id: zone.widgetInstance.id,
                    widgetTypeId: zone.widgetInstance.widgetTypeId,
                    active: zone.widgetInstance.active,
                    refreshPeriodSeconds: zone.widgetInstance.refreshPeriodSeconds,
                    configurationJson: asConfigurationRecord(zone.widgetInstance.configurationJson),
                }
                : null,
        })),
    };

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Modèles d’affichage', href: '/dashboard/display-templates'},
                    {label: template.name, href: detailHref},
                    {label: 'Modifier'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <DisplayTemplateForm
                    mode="edit"
                    templateId={template.id}
                    defaultValues={defaultValues}
                    widgetTypes={widgetTypes}
                    cancelHref={detailHref}
                />
            </div>
        </>
    );
}
