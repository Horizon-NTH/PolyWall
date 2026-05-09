import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DisplayTemplateForm } from '@/components/display-templates/display-template-form';
import { UserRole } from '@/generated/prisma/enums';
import { defineAbilityFor } from '@/lib/casl/ability';
import { findSupportedWidgetTypeOptions } from '@/lib/widgets/widget-type-queries';

export default async function Page() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('create', 'DisplayTemplate')) redirect('/dashboard');

    const organizationId = session.user.organizationId;
    const canCreateGlobalTemplates = session.user.role === UserRole.PLATFORM_SUPER_ADMIN;
    if (!organizationId && !canCreateGlobalTemplates) {
        throw new Error('Session invalide: un utilisateur non super-admin doit être rattaché à une organisation.');
    }

    const widgetTypes = await findSupportedWidgetTypeOptions();

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Modèles d’affichage', href: '/dashboard/display-templates'},
                    {label: 'Créer'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <DisplayTemplateForm
                    mode="create"
                    widgetTypes={widgetTypes}
                    cancelHref="/dashboard/display-templates"
                    canCreateGlobalTemplates={canCreateGlobalTemplates}
                    canCreateOrganizationTemplates={Boolean(organizationId)}
                    defaultScope={!organizationId && canCreateGlobalTemplates ? 'global' : 'organization'}
                />
            </div>
        </>
    );
}
