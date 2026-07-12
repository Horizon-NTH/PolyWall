'use client';

import { type LucideIcon } from 'lucide-react';
import Link from 'next/link';
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

    const cleanPathname = pathname.replace(/\/$/, '');
    const cleanUrl = url.replace(/\/$/, '');

    if (cleanUrl === '/dashboard') {
        return cleanPathname === cleanUrl;
    }

    return cleanPathname === cleanUrl || cleanPathname.startsWith(`${cleanUrl}/`);
}

export function NavSingle({items}: { items: NavItem[] }) {
    const pathname = usePathname();

    return (
        <SidebarGroup>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActivePath(pathname, item.url)}>
                            <Link href={item.url}>
                                <item.icon />
                                <span>{item.title}</span>
                            </Link>
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
                            <Link href={item.url}>
                                <item.icon />
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
