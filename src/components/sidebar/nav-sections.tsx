'use client';

import { Plus, type LucideIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

type NavItem = {
    title: string
    url: string
    icon: LucideIcon
};

function isActivePath(pathname: string, url: string) {
    if (url === '#' || url.length === 0) {
        return false;
    }
    return pathname === url || pathname.startsWith(`${url}/`);
}

export function NavCreate() {
    return (
        <SidebarGroup>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        asChild
                        className="bg-blue-dark text-white hover:bg-blue-dark/90 hover:text-white active:bg-blue-dark/90 active:text-white"
                    >
                        <button type="button">
                            <Plus />
                            <span>Créer</span>
                        </button>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    );
}

export function NavSingle({items}: { items: NavItem[] }) {
    const pathname = usePathname();

    return (
        <SidebarGroup>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActivePath(pathname, item.url)}>
                            <a href={item.url}>
                                <item.icon />
                                <span>{item.title}</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}

export function NavSection({
                               label,
                               items,
                               className,
                           }: {
    label: string
    items: NavItem[]
    className?: string
}) {
    const pathname = usePathname();

    return (
        <SidebarGroup className={className}>
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActivePath(pathname, item.url)}>
                            <a href={item.url}>
                                <item.icon />
                                <span>{item.title}</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
