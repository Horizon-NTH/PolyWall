import * as React from 'react';

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

export type DashboardBreadcrumbItem = {
    label: string
    href?: string
};

type DashboardHeaderProps = {
    items: DashboardBreadcrumbItem[]
};

export function DashboardHeader({items}: DashboardHeaderProps) {
    const lastIndex = items.length - 1;

    return (
        <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4"
                />
                <Breadcrumb>
                    <BreadcrumbList>
                        {items.map((item, index) => {
                            const isLast = index === lastIndex;
                            const shouldHide = !isLast;
                            const label = item.label;

                            return (
                                <React.Fragment key={`${item.label}-${index}`}>
                                    <BreadcrumbItem className={shouldHide ? 'hidden md:block' : undefined}>
                                        {item.href && !isLast ? (
                                            <BreadcrumbLink href={item.href}>
                                                {label}
                                            </BreadcrumbLink>
                                        ) : (
                                            <BreadcrumbPage>{label}</BreadcrumbPage>
                                        )}
                                    </BreadcrumbItem>
                                    {!isLast && (
                                        <BreadcrumbSeparator className="hidden md:block" />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
        </header>
    );
}
