'use client';

import * as React from 'react';
import {
    Building2,
    CalendarClock,
    Check,
    ChevronsUpDown,
    Image as ImageIcon,
    LayoutDashboard,
    ListMusic,
    Monitor,
    MoreHorizontal,
    Radio,
    Users,
} from 'lucide-react';

import { switchOrganization } from '@/actions/organization-actions';
import { NavCreate, NavSection, NavSingle } from '@/components/sidebar/nav-sections';
import { NavUser } from '@/components/sidebar/nav-user';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { defineAbilityFor } from '@/lib/casl/ability';
import { AbilityContext, Can } from '@/lib/casl/ability-context';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { UserRole } from '@/generated/prisma/enums';

const sidebarItems = {
    main: [{ title: 'Tableau de bord', url: '/dashboard', icon: LayoutDashboard }],
    contenus: [
        { title: 'Médias', url: '#', icon: ImageIcon },
        { title: 'Playlists', url: '#', icon: ListMusic },
        { title: 'Plus', url: '#', icon: MoreHorizontal },
    ],
    diffusion: [
        { title: 'Planification', url: '#', icon: CalendarClock },
        { title: 'Canaux', url: '#', icon: Radio },
        { title: 'Écrans', url: '#', icon: Monitor },
    ],
    administration: [
        { title: 'Entités', url: '#', icon: Building2 },
        { title: 'Utilisateurs', url: '#', icon: Users },
    ],
};

type OrganizationOption = {
    id: string
    name: string
}

type AppSidebarClientProps = React.ComponentProps<typeof Sidebar> & {
    organizations: OrganizationOption[]
    currentOrganizationId: string | null
    userRole: UserRole
    userOrganizationId: string | null
    user: {
        name: string
        email: string
        avatar: string
    }
}

function Logo({organizationLabel}: { organizationLabel: string }) {
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

export function AppSidebarClient({
                                     organizations,
                                     currentOrganizationId,
                                     userRole,
                                     userOrganizationId,
                                     user,
                                     ...props
                                 }: AppSidebarClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = React.useTransition();
    const ability = React.useMemo(
        () => defineAbilityFor({role: userRole, organizationId: userOrganizationId}),
        [userRole, userOrganizationId],
    );

    const currentOrganization =
        organizations.find((org) => org.id === currentOrganizationId) ?? null;
    const organizationLabel =
        currentOrganization?.name ??
        (organizations.length > 0 ? 'Choisir une organisation' : 'Aucune organisation');
    const hasMultipleOrganizations = organizations.length > 1;

    return (
        <AbilityContext.Provider value={ability}>
            <Sidebar variant="inset" {...props}>
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <Can I="switch" a="Organization">
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
                                                                await switchOrganization(organization.id);
                                                                router.refresh();
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
                    </SidebarMenu>
                </SidebarHeader>
                <SidebarContent>
                    <NavCreate />
                    <NavSingle items={sidebarItems.main} />
                    <NavSection label="Contenus" items={sidebarItems.contenus} />
                    <NavSection label="Diffusion" items={sidebarItems.diffusion} />
                    <NavSection label="Administration" items={sidebarItems.administration} className="mb-4" />
                </SidebarContent>
                <SidebarFooter>
                    <NavUser user={user} />
                </SidebarFooter>
            </Sidebar>
        </AbilityContext.Provider>
    );
}
