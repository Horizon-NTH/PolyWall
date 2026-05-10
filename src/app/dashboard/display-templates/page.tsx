import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import {
    DisplayTemplatesTable,
    type DisplayTemplateRow,
} from '@/components/display-templates/display-templates-table';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { UserRole } from '@/generated/prisma/enums';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';

export default async function Page() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('read', 'DisplayTemplate')) redirect('/dashboard');

    const organizationId = session.user.organizationId;
    const isPlatformSuperAdmin = session.user.role === UserRole.PLATFORM_SUPER_ADMIN;
    if (!organizationId && !isPlatformSuperAdmin) {
        throw new Error('Session invalide: un utilisateur non super-admin doit être rattaché à une organisation.');
    }

    const templates = await prisma.displayTemplate.findMany({
        where: {
            OR: [
                {organizationId: null},
                ...(organizationId ? [{organizationId}] : []),
            ],
        },
        select: {
            id: true,
            name: true,
            description: true,
            organizationId: true,
            resolutionX: true,
            resolutionY: true,
            updatedAt: true,
            zones: {
                select: {
                    id: true,
                    widgetInstance: {
                        select: {id: true},
                    },
                },
            },
            _count: {
                select: {
                    channels: true,
                },
            },
        },
        orderBy: {updatedAt: 'desc'},
    });

    const rows: DisplayTemplateRow[] = templates.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        scope: template.organizationId === null ? 'global' : 'organization',
        resolution: `${template.resolutionX}x${template.resolutionY}`,
        zonesCount: template.zones.length,
        widgetsCount: template.zones.reduce((total, zone) => total + (zone.widgetInstance ? 1 : 0), 0),
        channelsCount: template._count.channels,
        updatedAt: template.updatedAt.toISOString(),
    }));

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Modèles d\'affichage'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <DisplayTemplatesTable
                    data={rows}
                    canCreate={ability.can('create', 'DisplayTemplate')}
                    canUpdate={ability.can('update', 'DisplayTemplate')}
                    canDelete={ability.can('delete', 'DisplayTemplate')}
                    canManageGlobalTemplates={isPlatformSuperAdmin}
                />
            </div>
        </>
    );
}
