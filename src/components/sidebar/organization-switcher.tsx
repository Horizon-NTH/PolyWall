'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { switchOrganization } from '@/actions/organization-actions';
import { Can } from '@/lib/casl/ability-context';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

export type OrganizationOption = {
    id: string
    name: string
}

type OrganizationSwitcherProps = {
    organizations: OrganizationOption[]
    currentOrganizationId: string | null
}

function Logo({ organizationLabel }: { organizationLabel: string }) {
    return (
        <>
            <Image src="/logo.svg" alt="Logo PolyWall" width={32} height={32} className="size-8" />
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-blue-dark">PolyWall</span>
                <span className="truncate text-xs">{organizationLabel}</span>
            </div>
        </>
    );
}

export function OrganizationSwitcher({
    organizations,
    currentOrganizationId,
}: OrganizationSwitcherProps) {
    const router = useRouter();
    const [isPending, startTransition] = React.useTransition();

    const currentOrganization =
        organizations.find((org) => org.id === currentOrganizationId) ?? null;
    const organizationLabel =
        currentOrganization?.name ??
        (organizations.length > 0 ? 'Choisir une organisation' : 'Aucune organisation');
    const hasMultipleOrganizations = organizations.length > 1;

    return (
        <SidebarMenuItem>
            <Can I="switch" a="Organization" passThrough>
                {(allowed) =>
                    allowed && hasMultipleOrganizations ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <Logo organizationLabel={organizationLabel} />
                                    <ChevronsUpDown className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                                align="start"
                                sideOffset={4}
                                onCloseAutoFocus={(event) => event.preventDefault()}
                            >
                                <DropdownMenuLabel>Organisations</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {organizations.map((organization) => (
                                    <DropdownMenuItem
                                        key={organization.id}
                                        onSelect={() => {
                                            startTransition(async () => {
                                                const result = await switchOrganization(organization.id);
                                                if (result?.ok) {
                                                    router.refresh();
                                                    return;
                                                }
                                                toast.error('Impossible de changer d’organisation.');
                                            });
                                        }}
                                        disabled={isPending}
                                        className={cn(
                                            'flex items-center justify-between',
                                            organization.id === currentOrganizationId && 'font-medium',
                                        )}
                                    >
                                        <span className="truncate">{organization.name}</span>
                                        <Check
                                            className={cn(
                                                'size-4',
                                                organization.id === currentOrganizationId
                                                    ? 'opacity-100'
                                                    : 'opacity-0',
                                            )}
                                        />
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <SidebarMenuButton size="lg" asChild>
                            <a href="/dashboard">
                                <Logo organizationLabel={organizationLabel} />
                            </a>
                        </SidebarMenuButton>
                    )
                }
            </Can>
        </SidebarMenuItem>
    );
}
