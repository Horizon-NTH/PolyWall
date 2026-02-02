'use client';

import * as React from 'react';
import { MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DataTableRowActionsProps {
    label?: string;
    children: React.ReactNode;
}

export function DataTableRowActions({
                                        label = 'Actions',
                                        children,
                                    }: DataTableRowActionsProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    <MoreHorizontal />
                    <span className="sr-only">Ouvrir le menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-48"
                onCloseAutoFocus={(event) => event.preventDefault()}
            >
                <DropdownMenuLabel>{label}</DropdownMenuLabel>
                {children}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
