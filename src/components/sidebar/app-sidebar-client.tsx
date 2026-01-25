'use client';

import * as React from 'react';
import {
    BookOpen,
    Bot,
    Check,
    ChevronsUpDown,
    Frame,
    LifeBuoy,
    Map,
    PieChart,
    Send,
    Settings2,
    SquareTerminal,
} from 'lucide-react';

import { switchOrganization } from '@/actions/organization-actions';
import { NavMain } from '@/components/sidebar/nav-main';
import { NavProjects } from '@/components/sidebar/nav-projects';
import { NavSecondary } from '@/components/sidebar/nav-secondary';
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
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const data = {
    navMain: [
        {
            title: 'Playground',
            url: '#',
            icon: SquareTerminal,
            isActive: true,
            items: [
                {
                    title: 'History',
                    url: '#',
                },
                {
                    title: 'Starred',
                    url: '#',
                },
                {
                    title: 'Settings',
                    url: '#',
                },
            ],
        },
        {
            title: 'Models',
            url: '#',
            icon: Bot,
            items: [
                {
                    title: 'Genesis',
                    url: '#',
                },
                {
                    title: 'Explorer',
                    url: '#',
                },
                {
                    title: 'Quantum',
                    url: '#',
                },
            ],
        },
        {
            title: 'Documentation',
            url: '#',
            icon: BookOpen,
            items: [
                {
                    title: 'Introduction',
                    url: '#',
                },
                {
                    title: 'Get Started',
                    url: '#',
                },
                {
                    title: 'Tutorials',
                    url: '#',
                },
                {
                    title: 'Changelog',
                    url: '#',
                },
            ],
        },
        {
            title: 'Settings',
            url: '#',
            icon: Settings2,
            items: [
                {
                    title: 'General',
                    url: '#',
                },
                {
                    title: 'Team',
                    url: '#',
                },
                {
                    title: 'Billing',
                    url: '#',
                },
                {
                    title: 'Limits',
                    url: '#',
                },
            ],
        },
    ],
    navSecondary: [
        {
            title: 'Support',
            url: '#',
            icon: LifeBuoy,
        },
        {
            title: 'Feedback',
            url: '#',
            icon: Send,
        },
    ],
    projects: [
        {
            name: 'Design Engineering',
            url: '#',
            icon: Frame,
        },
        {
            name: 'Sales & Marketing',
            url: '#',
            icon: PieChart,
        },
        {
            name: 'Travel',
            url: '#',
            icon: Map,
        },
    ],
};

type OrganizationOption = {
    id: string
    name: string
}

type AppSidebarClientProps = React.ComponentProps<typeof Sidebar> & {
    organizations: OrganizationOption[]
    currentOrganizationId: string | null
    canSwitchOrganizations: boolean
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
                                     canSwitchOrganizations,
                                     user,
                                     ...props
                                 }: AppSidebarClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = React.useTransition();

    const currentOrganization =
        organizations.find((org) => org.id === currentOrganizationId) ?? null;
    const organizationLabel =
        currentOrganization?.name ??
        (organizations.length > 0 ? 'Choisir une organisation' : 'Aucune organisation');
    const showSwitcher = canSwitchOrganizations && organizations.length > 1;

    return (
        <Sidebar variant="inset" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        {showSwitcher ? (
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
                        )}
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
                <NavProjects projects={data.projects} />
                <NavSecondary items={data.navSecondary} className="mt-auto" />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={user} />
            </SidebarFooter>
        </Sidebar>
    );
}
