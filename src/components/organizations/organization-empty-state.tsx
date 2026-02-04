import { Building2 } from 'lucide-react';

import { OrganizationSelect } from '@/components/organizations/organization-select';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import type { OrganizationOption } from '@/components/sidebar/organization-switcher';

type OrganizationEmptyStateProps = {
    organizations: OrganizationOption[]
    title?: string
    description?: string
};

export function OrganizationEmptyState({
                                           organizations,
                                           title = 'Aucune organisation rattachée',
                                           description = 'Sélectionnez une organisation pour accéder à cette page.',
                                       }: OrganizationEmptyStateProps) {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Building2 className="size-5" />
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <OrganizationSelect organizations={organizations} />
            </EmptyContent>
        </Empty>
    );
}
