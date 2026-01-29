'use client';

import * as React from 'react';
import {
    Building2,
    CalendarClock,
    Image as ImageIcon,
    LayoutDashboard,
    ListMusic,
    Monitor,
    MoreHorizontal,
    Radio,
    Users,
} from 'lucide-react';

import { NavCreate, NavSection, NavSingle } from '@/components/sidebar/nav-sections';
import { NavUser } from '@/components/sidebar/nav-user';
import { OrganizationSwitcher, OrganizationOption } from '@/components/sidebar/organization-switcher';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
} from '@/components/ui/sidebar';
import { defineAbilityFor } from '@/lib/casl/ability';
import { AbilityContext, Can } from '@/lib/casl/ability-context';
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

export function AppSidebarClient({
                                     organizations,
                                     currentOrganizationId,
                                     userRole,
                                     userOrganizationId,
                                 user,
                                 ...props
                                 }: AppSidebarClientProps) {
    const ability = React.useMemo(
        () => defineAbilityFor({role: userRole, organizationId: userOrganizationId}),
        [userRole, userOrganizationId],
    );

    return (
        <AbilityContext.Provider value={ability}>
            <Sidebar variant="inset" {...props}>
                <SidebarHeader>
                    <SidebarMenu>
                        <OrganizationSwitcher
                            organizations={organizations}
                            currentOrganizationId={currentOrganizationId}
                        />
                    </SidebarMenu>
                </SidebarHeader>
                <SidebarContent>
                <NavCreate />
                <NavSingle items={sidebarItems.main} />
                <NavSection label="Contenus" items={sidebarItems.contenus} />
                <NavSection label="Diffusion" items={sidebarItems.diffusion} />
                <Can I="view" a="AdminSection">
                    <NavSection label="Administration" items={sidebarItems.administration} className="mb-4" />
                </Can>
            </SidebarContent>
                <SidebarFooter>
                    <NavUser user={user} />
                </SidebarFooter>
            </Sidebar>
        </AbilityContext.Provider>
    );
}
