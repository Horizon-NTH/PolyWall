'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type ColumnDef, type FilterFn } from '@tanstack/react-table';

import { deleteDisplayTemplate } from '@/actions/display-template-actions';
import { DisplayTemplateDeleteDialog } from '@/components/display-templates/display-template-delete-dialog';
import { DisplayTemplateEmptyState } from '@/components/display-templates/display-template-empty-state';
import { DataTableColumnHeader } from '@/components/table/data-table-column-header';
import { DataTablePagination } from '@/components/table/data-table-pagination';
import { DataTableRowActions } from '@/components/table/data-table-row-actions';
import { DataTableToolbar } from '@/components/table/data-table-toolbar';
import { DataTableView } from '@/components/table/data-table';
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
import { useDataTable } from '@/hooks/use-data-table';
import { useCurrentReturnTo } from '@/hooks/use-current-return-to';
import { appendReturnTo } from '@/lib/return-to';
import { formatDate } from '@/lib/utils';
import {
    displayTemplateListFilterSchema,
    type DisplayTemplateListFilterValues,
} from '@/schemas/display-template-schema';
import { ChevronDown } from 'lucide-react';

export type DisplayTemplateRow = {
    id: string;
    name: string;
    description: string;
    scope: 'global' | 'organization';
    resolution: string;
    zonesCount: number;
    widgetsCount: number;
    channelsCount: number;
    updatedAt: string;
};

type ScopeFilter = DisplayTemplateListFilterValues['scope'];
type SortFilter = DisplayTemplateListFilterValues['sort'] | 'none';

const equalsFilter: FilterFn<DisplayTemplateRow> = (row, columnId, value) => {
    if (!value || value === 'all') return true;
    return row.getValue(columnId) === value;
};

const sortBy: Record<Exclude<SortFilter, 'none'>, { id: string; desc: boolean }> = {
    'updatedAt-desc': {id: 'updatedAt', desc: true},
    'updatedAt-asc': {id: 'updatedAt', desc: false},
    'name-asc': {id: 'name', desc: false},
    'name-desc': {id: 'name', desc: true},
    'channels-desc': {id: 'channelsCount', desc: true},
    'channels-asc': {id: 'channelsCount', desc: false},
};

type DisplayTemplatesTableProps = {
    data: DisplayTemplateRow[];
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
};

export function DisplayTemplatesTable({data, canCreate, canUpdate, canDelete}: DisplayTemplatesTableProps) {
    const router = useRouter();
    const currentReturnTo = useCurrentReturnTo();
    const defaults = displayTemplateListFilterSchema.parse({});
    const [scopeFilterValue, setScopeFilterValue] = React.useState<ScopeFilter>(defaults.scope);
    const [sortFilterValue, setSortFilterValue] = React.useState<SortFilter>('none');
    const [deleteTarget, setDeleteTarget] = React.useState<DisplayTemplateRow | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
    const [isPending, startTransition] = React.useTransition();

    const openDeleteDialog = React.useCallback((template: DisplayTemplateRow) => {
        setDeleteTarget(template);
        setIsDeleteOpen(true);
    }, []);

    const columns = React.useMemo<ColumnDef<DisplayTemplateRow>[]>(() => [
        {
            id: 'searchText',
            accessorFn: (row) => `${row.name} ${row.description} ${row.resolution}`,
            enableHiding: true,
            enableSorting: false,
            enableColumnFilter: true,
        },
        {
            accessorKey: 'name',
            meta: {label: 'Nom'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Nom" />,
            cell: ({row}) => (
                <div className="flex min-w-0 max-w-80 flex-col gap-1">
                    <Link
                        href={appendReturnTo(`/dashboard/display-templates/${row.original.id}`, currentReturnTo)}
                        className="text-foreground block truncate font-medium underline-offset-4 hover:underline"
                        title={row.original.name}
                    >
                        {row.original.name}
                    </Link>
                    <div className="text-muted-foreground truncate text-sm">{row.original.description}</div>
                </div>
            ),
        },
        {
            accessorKey: 'scope',
            meta: {label: 'Portée'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Portée" />,
            cell: ({row}) => (
                <div className="text-sm">
                    {row.original.scope === 'global' ? 'Global' : 'Organisation'}
                </div>
            ),
            filterFn: equalsFilter,
        },
        {
            accessorKey: 'resolution',
            meta: {label: 'Résolution'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Résolution" />,
            cell: ({row}) => <div className="text-sm">{row.original.resolution}</div>,
        },
        {
            accessorKey: 'zonesCount',
            meta: {label: 'Zones'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Zones" />,
            cell: ({row}) => <div className="text-sm">{row.original.zonesCount}</div>,
        },
        {
            accessorKey: 'widgetsCount',
            meta: {label: 'Widgets'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Widgets" />,
            cell: ({row}) => <div className="text-sm">{row.original.widgetsCount}</div>,
        },
        {
            accessorKey: 'channelsCount',
            meta: {label: 'Canaux'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Canaux" />,
            cell: ({row}) => <div className="text-sm">{row.original.channelsCount}</div>,
        },
        {
            accessorKey: 'updatedAt',
            meta: {label: 'Mis à jour le'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Mis à jour le" />,
            cell: ({row}) => (
                <div className="text-muted-foreground text-sm">{formatDate(new Date(row.original.updatedAt))}</div>
            ),
        },
        {
            id: 'sortLabel',
            accessorFn: () => 'all',
            filterFn: equalsFilter,
            enableHiding: true,
            enableSorting: false,
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({row}) => {
                const template = row.original;
                const canMutateRow = template.scope === 'organization';

                return (
                    <DataTableRowActions>
                        <DropdownMenuItem asChild>
                            <Link href={appendReturnTo(`/dashboard/display-templates/${template.id}`, currentReturnTo)}>
                                Voir la fiche
                            </Link>
                        </DropdownMenuItem>
                        {canUpdate && canMutateRow ? (
                            <DropdownMenuItem asChild>
                                <Link
                                    href={appendReturnTo(`/dashboard/display-templates/${template.id}/edit`, currentReturnTo)}>
                                    Modifier
                                </Link>
                            </DropdownMenuItem>
                        ) : null}
                        {canDelete && canMutateRow ? (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => openDeleteDialog(template)}>
                                    Supprimer
                                </DropdownMenuItem>
                            </>
                        ) : null}
                    </DataTableRowActions>
                );
            },
        },
    ], [canDelete, canUpdate, currentReturnTo, openDeleteDialog]);

    const table = useDataTable({
        data,
        columns,
        initialPageSize: 10,
        enablePagination: true,
        initialColumnVisibility: {
            searchText: false,
            sortLabel: false,
        },
    });

    React.useEffect(() => {
        table.getColumn('scope')?.setFilterValue(scopeFilterValue === 'all' ? undefined : scopeFilterValue);
    }, [scopeFilterValue, table]);

    React.useEffect(() => {
        if (sortFilterValue === 'none') {
            table.setSorting([]);
            return;
        }

        const next = sortBy[sortFilterValue];
        table.setSorting([{id: next.id, desc: next.desc}]);
    }, [sortFilterValue, table]);

    const resetFilters = () => {
        setScopeFilterValue(defaults.scope);
        setSortFilterValue('none');
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        const result = await deleteDisplayTemplate(deleteTarget.id);
        if (!result.ok) {
            toast.error(result.message);
            return;
        }

        toast.success('Modèle supprimé.');
        setIsDeleteOpen(false);
        setDeleteTarget(null);
        router.refresh();
    };

    if (data.length === 0) {
        return <DisplayTemplateEmptyState canCreate={canCreate} />;
    }

    return (
        <div className="flex min-w-0 max-w-full flex-col gap-4">
            <DataTableToolbar
                table={table}
                searchColumnId="searchText"
                searchPlaceholder="Rechercher un modèle..."
                onReset={resetFilters}
                filters={
                    <>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    Portée
                                    <ChevronDown />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuLabel>Filtrer</DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={scopeFilterValue}
                                    onValueChange={(value) => setScopeFilterValue(value as ScopeFilter)}
                                >
                                    <DropdownMenuRadioItem value="all">Toutes</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="organization">Organisation</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="global">Globales</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    Trier
                                    <ChevronDown />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuLabel>Tri</DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={sortFilterValue}
                                    onValueChange={(value) => setSortFilterValue(value as SortFilter)}
                                >
                                    <DropdownMenuRadioItem value="none">Par défaut</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="updatedAt-desc">Mis à jour
                                        récemment</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="name-asc">Nom A-Z</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="channels-desc">Canaux
                                        décroissant</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                }
                actions={canCreate ? (
                    <Button asChild>
                        <Link href="/dashboard/display-templates/new">Créer</Link>
                    </Button>
                ) : null}
            />
            <DataTableView table={table} />
            <DataTablePagination table={table} />
            <DisplayTemplateDeleteDialog
                open={isDeleteOpen}
                onOpenChange={setIsDeleteOpen}
                channelsCount={deleteTarget?.channelsCount ?? 0}
                onConfirm={() => startTransition(handleDelete)}
                confirmDisabled={isPending}
                title={deleteTarget ? <span className="break-all">Supprimer {deleteTarget.name} ?</span> : undefined}
            />
        </div>
    );
}
