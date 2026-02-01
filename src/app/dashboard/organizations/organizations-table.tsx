'use client';

import * as React from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type ColumnDef, type FilterFn } from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';

import { DataTableColumnHeader } from '@/components/table/data-table-column-header';
import { DataTablePagination } from '@/components/table/data-table-pagination';
import { DataTableRowActions } from '@/components/table/data-table-row-actions';
import { DataTableToolbar } from '@/components/table/data-table-toolbar';
import { DataTableView } from '@/components/table/data-table';
import { useDataTable } from '@/hooks/use-data-table';

export type OrganizationRow = {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    usersCount: number;
    screensCount: number;
    channelsCount: number;
};

type CountPresenceFilter = 'all' | 'with' | 'without';

const countPresenceFilter: FilterFn<OrganizationRow> = (
    row,
    columnId,
    value,
) => {
    if (value === 'with') return Number(row.getValue(columnId)) > 0;
    if (value === 'without') return Number(row.getValue(columnId)) === 0;
    return true;
};

const formatDate = (value: string) =>
    new Intl.DateTimeFormat('fr-FR', {dateStyle: 'medium'}).format(
        new Date(value),
    );

export const columns: ColumnDef<OrganizationRow>[] = [
    {
        accessorKey: 'name',
        meta: {label: 'Organisation'},
        header: ({column}) => (
            <DataTableColumnHeader column={column} title="Organisation" />
        ),
        cell: ({row}) => {
            const description = row.original.description;
            return (
                <div className="space-y-1">
                    <div className="font-medium">{row.getValue('name')}</div>
                    <div className="text-muted-foreground max-w-90 truncate text-sm">
                        {description}
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: 'usersCount',
        meta: {label: 'Utilisateurs'},
        header: ({column}) => (
            <DataTableColumnHeader column={column} title="Utilisateurs" />
        ),
        cell: ({row}) => (
            <div className="text-right font-medium">
                {row.getValue('usersCount')}
            </div>
        ),
        filterFn: countPresenceFilter,
    },
    {
        accessorKey: 'screensCount',
        meta: {label: 'Écrans'},
        header: ({column}) => (
            <DataTableColumnHeader column={column} title="Écrans" />
        ),
        cell: ({row}) => (
            <div className="text-right font-medium">
                {row.getValue('screensCount')}
            </div>
        ),
        filterFn: countPresenceFilter,
    },
    {
        accessorKey: 'channelsCount',
        meta: {label: 'Canaux'},
        header: ({column}) => (
            <DataTableColumnHeader column={column} title="Canaux" />
        ),
        cell: ({row}) => (
            <div className="text-right font-medium">
                {row.getValue('channelsCount')}
            </div>
        ),
    },
    {
        accessorKey: 'createdAt',
        meta: {label: 'Créée le'},
        header: ({column}) => (
            <DataTableColumnHeader column={column} title="Créée le" />
        ),
        cell: ({row}) => (
            <div className="text-muted-foreground text-sm">
                {formatDate(row.getValue('createdAt'))}
            </div>
        ),
    },
    {
        id: 'actions',
        enableHiding: false,
        cell: ({row}) => {
            const organization = row.original;

            return (
                <DataTableRowActions>
                    <DropdownMenuItem
                        onClick={() => navigator.clipboard.writeText(organization.id)}
                    >
                        Copier l&apos;ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href={`/dashboard/organizations/${organization.id}`}>
                            Voir la fiche
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>Modifier</DropdownMenuItem>
                </DataTableRowActions>
            );
        },
    },
];

type OrganizationsTableProps = {
    data: OrganizationRow[];
};

export function OrganizationsTable({data}: OrganizationsTableProps) {
    const [usersFilter, setUsersFilter] = React.useState<CountPresenceFilter>('all');
    const [screensFilter, setScreensFilter] = React.useState<CountPresenceFilter>('all');

    const table = useDataTable({
        data,
        columns,
        initialPageSize: 10,
        enablePagination: true,
    });

    React.useEffect(() => {
        table
            .getColumn('usersCount')
            ?.setFilterValue(usersFilter === 'all' ? undefined : usersFilter);
    }, [table, usersFilter]);

    React.useEffect(() => {
        table
            .getColumn('screensCount')
            ?.setFilterValue(screensFilter === 'all' ? undefined : screensFilter);
    }, [table, screensFilter]);

    const resetFilters = () => {
        setUsersFilter('all');
        setScreensFilter('all');
    };

    return (
        <div className="flex flex-col gap-4">
            <DataTableToolbar
                table={table}
                searchColumnId="name"
                searchPlaceholder="Rechercher une organisation..."
                onReset={resetFilters}
                filters={
                    <>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    Filtres
                                    <ChevronDown />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56">
                                <DropdownMenuLabel>Utilisateurs</DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={usersFilter}
                                    onValueChange={(value) =>
                                        setUsersFilter(value as CountPresenceFilter)
                                    }
                                >
                                    <DropdownMenuRadioItem value="all">
                                        Tous
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="with">
                                        Avec utilisateurs
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="without">
                                        Sans utilisateurs
                                    </DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Écrans</DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={screensFilter}
                                    onValueChange={(value) =>
                                        setScreensFilter(value as CountPresenceFilter)
                                    }
                                >
                                    <DropdownMenuRadioItem value="all">
                                        Tous
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="with">
                                        Avec écrans
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="without">
                                        Sans écrans
                                    </DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                }
            />
            <DataTableView table={table} />
            <DataTablePagination table={table} />
        </div>
    );
}
