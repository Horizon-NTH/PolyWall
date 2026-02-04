'use client';

import { useOrganizationSwitch } from '@/hooks/use-organization-switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OrganizationOption } from '@/components/sidebar/organization-switcher';

type OrganizationSelectProps = {
    organizations: OrganizationOption[]
};

export function OrganizationSelect({organizations}: OrganizationSelectProps) {
    const {isPending, switchTo} = useOrganizationSwitch();

    if (organizations.length === 0) {
        return <p className="text-sm text-muted-foreground">Aucune organisation disponible.</p>;
    }

    return (
        <Select
            onValueChange={(value) => {
                switchTo(value);
            }}
            disabled={isPending}
        >
            <SelectTrigger className="w-full" data-testid="organization-select-trigger">
                <SelectValue placeholder="Sélectionner une organisation" />
            </SelectTrigger>
            <SelectContent>
                {organizations.map((organization) => (
                    <SelectItem key={organization.id} value={organization.id}>
                        {organization.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
