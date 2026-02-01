import { type Table } from '@tanstack/react-table';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface DataTablePaginationProps<TData> {
    table: Table<TData>;
    showSelection?: boolean;
    pageSizes?: number[];
}

export function DataTablePagination<TData>({
                                               table,
                                               showSelection = false,
                                               pageSizes = [10, 20, 25, 30, 40, 50],
                                           }: DataTablePaginationProps<TData>) {
    const pageIndex = table.getState().pagination.pageIndex + 1;
    const pageCount = Math.max(table.getPageCount(), 1);
    const pageSize = table.getState().pagination.pageSize;

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 px-2">
            <div className="text-muted-foreground flex-1 text-sm">
                {showSelection
                    ? `${table.getFilteredSelectedRowModel().rows.length} sur ${table.getFilteredRowModel().rows.length} sélectionné(s)`
                    : `${table.getFilteredRowModel().rows.length} ligne(s)`}
            </div>
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Lignes par page</p>
                    <Select
                        value={`${pageSize}`}
                        onValueChange={(value) => table.setPageSize(Number(value))}
                    >
                        <SelectTrigger className="h-8 w-18">
                            <SelectValue placeholder={pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {pageSizes.map((size) => (
                                <SelectItem key={size} value={`${size}`}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-sm font-medium">
                    Page {pageIndex} sur {pageCount}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="hidden size-8 lg:flex"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <span className="sr-only">Première page</span>
                        <ChevronsLeft />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <span className="sr-only">Page précédente</span>
                        <ChevronLeft />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <span className="sr-only">Page suivante</span>
                        <ChevronRight />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="hidden size-8 lg:flex"
                        onClick={() => table.setPageIndex(pageCount - 1)}
                        disabled={!table.getCanNextPage()}
                    >
                        <span className="sr-only">Dernière page</span>
                        <ChevronsRight />
                    </Button>
                </div>
            </div>
        </div>
    );
}
