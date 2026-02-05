import {
    ColumnDef,
    ColumnFiltersState,
    getCoreRowModel, getFacetedRowModel, getFacetedUniqueValues, getFilteredRowModel,
    getPaginationRowModel, getSortedRowModel,
    SortingState,
    useReactTable,
    VisibilityState,
} from '@tanstack/react-table';
import * as React from 'react';

export type UseDataTableOptions<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    initialPageSize?: number;
    enableRowSelection?: boolean;
    enablePagination?: boolean;
    initialColumnVisibility?: VisibilityState;
};

export function useDataTable<TData, TValue>({
                                                columns,
                                                data,
                                                initialPageSize = 10,
                                                enableRowSelection = false,
                                                enablePagination = true,
                                                initialColumnVisibility = {},
                                            }: UseDataTableOptions<TData, TValue>) {
    const [rowSelection, setRowSelection] = React.useState({});
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [sorting, setSorting] = React.useState<SortingState>([]);

    // eslint-disable-next-line react-hooks/incompatible-library
    return useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
            columnFilters,
        },
        initialState: {
            pagination: {
                pageSize: initialPageSize,
            },
        },
        enableRowSelection,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        ...(enablePagination
            ? {
                getPaginationRowModel: getPaginationRowModel(),
            }
            : {}),
    });
}
