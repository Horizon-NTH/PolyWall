import React from 'react';
import { type Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface DataTableColumnHeaderProps<TData, TValue>
    extends React.HTMLAttributes<HTMLDivElement> {
    column: Column<TData, TValue>;
    title: string;
}

export function DataTableColumnHeader<TData, TValue>({
                                                         column,
                                                         title,
                                                     }: DataTableColumnHeaderProps<TData, TValue>) {
    const sorted = column.getIsSorted();

    return (
        <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
            {title}
            {sorted === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
            ) : sorted === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
        </Button>
    );
}
