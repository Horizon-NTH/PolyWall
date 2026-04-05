'use client';

import * as React from 'react';
import { type Table } from '@tanstack/react-table';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableViewOptions } from '@/components/table/data-table-view-options';

type DataTableToolbarProps<TData> = {
    table: Table<TData>;
    searchColumnId?: string;
    searchPlaceholder?: string;
    filters?: React.ReactNode;
    actions?: React.ReactNode;
    showViewOptions?: boolean;
    showReset?: boolean;
    onReset?: () => void;
};

export function DataTableToolbar<TData>({
                                            table,
                                            searchColumnId,
                                            searchPlaceholder = 'Rechercher...',
                                            filters,
                                            actions,
                                            showViewOptions = true,
                                            showReset = true,
                                            onReset,
                                        }: DataTableToolbarProps<TData>) {
    const isFiltered = table.getState().columnFilters.length > 0;
    const isSorted = table.getState().sorting.length > 0;
    const shouldShowReset = showReset && (isFiltered || isSorted);

    const handleReset = () => {
        table.resetColumnFilters();
        table.resetSorting();
        onReset?.();
    };

    return (
        <div className="flex min-w-0 max-w-full flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {searchColumnId ? (
                    <Input
                        placeholder={searchPlaceholder}
                        value={(table.getColumn(searchColumnId)?.getFilterValue() as string) ?? ''}
                        onChange={(event) =>
                            table.getColumn(searchColumnId)?.setFilterValue(event.target.value)
                        }
                        className="max-w-sm min-w-0"
                    />
                ) : null}
                {filters}
                {shouldShowReset ? (
                    <Button
                        variant="ghost"
                        onClick={handleReset}
                    >
                        Réinitialiser
                        <X />
                    </Button>
                ) : null}
            </div>
            <div className="flex min-w-0 items-center gap-2">
                {showViewOptions ? <DataTableViewOptions table={table} /> : null}
                {actions}
            </div>
        </div>
    );
}
