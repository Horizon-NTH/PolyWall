'use client';

import * as React from 'react';
import {
    flexRender,
    type ColumnDef,
    type Row,
    type Table,
} from '@tanstack/react-table';

import {
    Table as TableRoot,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export function getRowSelectionColumn<TData>(): ColumnDef<TData> {
    return {
        id: 'select',
        header: ({table}) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && 'indeterminate')
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Sélectionner tout"
            />
        ),
        cell: ({row}) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Sélectionner la ligne"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    };
}

type DataTableViewProps<TData> = {
    table: Table<TData>;
    emptyMessage?: string;
    getRowClassName?: (row: Row<TData>) => string | undefined;
};

function isStickyActionsColumn(columnId: string) {
    return columnId === 'actions';
}

const stickyActionsColumnClassName =
    'sticky right-0 z-10 bg-background before:pointer-events-none before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-gradient-to-r before:from-transparent before:to-background before:content-[\'\']';

export function DataTableView<TData>({
                                         table,
                                         emptyMessage = 'Aucun résultat.',
                                         getRowClassName,
                                     }: DataTableViewProps<TData>) {
    const columnsCount = table.getAllLeafColumns().length;

    return (
        <div className="min-w-0 max-w-full overflow-hidden rounded-md border">
            <div className="w-full min-w-0 max-w-full overflow-x-auto">
                <TableRoot className="min-w-full w-max">
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        className={cn(
                                            isStickyActionsColumn(header.column.id) && stickyActionsColumnClassName,
                                        )}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext(),
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                    className={cn('group', getRowClassName?.(row))}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className={cn(
                                                isStickyActionsColumn(cell.column.id) && stickyActionsColumnClassName,
                                            )}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columnsCount} className="h-24 text-center">
                                    {emptyMessage}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </TableRoot>
            </div>
        </div>
    );
}
