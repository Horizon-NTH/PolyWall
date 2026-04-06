'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type ColumnDef, type FilterFn } from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';

import { deleteChannel } from '@/actions/channel-actions';
import { ChannelEmptyState } from '@/components/channels/channel-empty-state';
import { DataTableColumnHeader } from '@/components/table/data-table-column-header';
import { DataTablePagination } from '@/components/table/data-table-pagination';
import { DataTableRowActions } from '@/components/table/data-table-row-actions';
import { DataTableToolbar } from '@/components/table/data-table-toolbar';
import { DataTableView } from '@/components/table/data-table';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { type ChannelListFilterValues, channelListFilterSchema } from '@/schemas/channel-schema';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type ChannelRow = {
    id: string;
    name: string;
    description: string;
    displayTemplateName: string;
    screensCount: number;
    schedulesCount: number;
    createdAt: string;
    updatedAt: string;
};

type ScreensFilter = ChannelListFilterValues['screens'];
type SchedulesFilter = ChannelListFilterValues['schedules'];
type SortFilter = ChannelListFilterValues['sort'] | 'none';

const countFilter =
    (countField: 'screensCount' | 'schedulesCount'): FilterFn<ChannelRow> =>
        (row, _columnId, value) => {
            if (!value || value === 'all') return true;

            const count = row.original[countField];
            if (value === 'with-screens' || value === 'with-schedules') {
                return count > 0;
            }

            return count === 0;
        };

const equalsFilter: FilterFn<ChannelRow> = (row, columnId, value) => {
    if (!value || value === 'all') return true;
    return row.getValue(columnId) === value;
};

const sortBy: Record<Exclude<SortFilter, 'none'>, { id: string; desc: boolean }> = {
    'updatedAt-desc': {id: 'updatedAt', desc: true},
    'updatedAt-asc': {id: 'updatedAt', desc: false},
    'createdAt-desc': {id: 'createdAt', desc: true},
    'createdAt-asc': {id: 'createdAt', desc: false},
    'name-asc': {id: 'name', desc: false},
    'name-desc': {id: 'name', desc: true},
    'screens-desc': {id: 'screensCount', desc: true},
    'screens-asc': {id: 'screensCount', desc: false},
    'schedules-desc': {id: 'schedulesCount', desc: true},
    'schedules-asc': {id: 'schedulesCount', desc: false},
};

type ChannelsTableProps = {
    data: ChannelRow[];
    canManage: boolean;
};

export function ChannelsTable({data, canManage}: ChannelsTableProps) {
    const router = useRouter();
    const currentReturnTo = useCurrentReturnTo();
    const defaults = channelListFilterSchema.parse({});
    const [screensFilterValue, setScreensFilterValue] = React.useState<ScreensFilter>(defaults.screens);
    const [schedulesFilterValue, setSchedulesFilterValue] = React.useState<SchedulesFilter>(defaults.schedules);
    const [sortFilterValue, setSortFilterValue] = React.useState<SortFilter>('none');
    const [deleteTarget, setDeleteTarget] = React.useState<ChannelRow | null>(null);
    const [reassignToChannelId, setReassignToChannelId] = React.useState('');
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
    const [isPending, startTransition] = React.useTransition();

    const openDeleteDialog = React.useCallback((channel: ChannelRow) => {
        setDeleteTarget(channel);
        setReassignToChannelId('');
        setIsDeleteOpen(true);
    }, []);

    const columns = React.useMemo<ColumnDef<ChannelRow>[]>(() => [
        {
            id: 'searchText',
            accessorFn: (row) => `${row.name} ${row.description} ${row.displayTemplateName}`,
            enableHiding: true,
            enableSorting: false,
            enableColumnFilter: true,
        },
        {
            accessorKey: 'name',
            meta: {label: 'Nom'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Nom" />,
            cell: ({row}) => (
                <div className="space-y-1 min-w-0 max-w-70">
                    <Link
                        href={appendReturnTo(`/dashboard/channels/${row.original.id}`, currentReturnTo)}
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
            accessorKey: 'description',
            meta: {label: 'Description'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Description" />,
            cell: ({row}) => (
                <div className="text-muted-foreground max-w-70 truncate text-sm" title={row.original.description}>
                    {row.original.description}
                </div>
            ),
        },
        {
            accessorKey: 'displayTemplateName',
            meta: {label: 'Modèle'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Modèle" />,
            cell: ({row}) => <div className="text-sm">{row.original.displayTemplateName}</div>,
        },
        {
            accessorKey: 'screensCount',
            meta: {label: 'Écrans'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Écrans" />,
            cell: ({row}) => <div className="text-sm">{row.original.screensCount}</div>,
            filterFn: countFilter('screensCount'),
        },
        {
            accessorKey: 'schedulesCount',
            meta: {label: 'Planifications'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Planifications" />,
            cell: ({row}) => <div className="text-sm">{row.original.schedulesCount}</div>,
            filterFn: countFilter('schedulesCount'),
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
            accessorKey: 'createdAt',
            meta: {label: 'Créé le'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Créé le" />,
            cell: ({row}) => (
                <div className="text-muted-foreground text-sm">{formatDate(new Date(row.original.createdAt))}</div>
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
            cell: ({row}) => (
                <DataTableRowActions>
                    <DropdownMenuItem asChild>
                        <Link href={appendReturnTo(`/dashboard/channels/${row.original.id}`, currentReturnTo)}>
                            Voir la fiche
                        </Link>
                    </DropdownMenuItem>
                    {canManage ? (
                        <>
                            <DropdownMenuItem asChild>
                                <Link
                                    href={appendReturnTo(`/dashboard/channels/${row.original.id}/edit`, currentReturnTo)}>
                                    Modifier infos
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => openDeleteDialog(row.original)}>
                                Supprimer
                            </DropdownMenuItem>
                        </>
                    ) : null}
                </DataTableRowActions>
            ),
        },
    ], [canManage, currentReturnTo, openDeleteDialog]);

    const table = useDataTable({
        data,
        columns,
        initialPageSize: 10,
        enablePagination: true,
        initialColumnVisibility: {
            searchText: false,
            description: false,
            sortLabel: false,
            createdAt: false,
        },
    });

    React.useEffect(() => {
        table.getColumn('screensCount')
            ?.setFilterValue(screensFilterValue === 'all' ? undefined : screensFilterValue);
    }, [table, screensFilterValue]);

    React.useEffect(() => {
        table.getColumn('schedulesCount')
            ?.setFilterValue(schedulesFilterValue === 'all' ? undefined : schedulesFilterValue);
    }, [table, schedulesFilterValue]);

    React.useEffect(() => {
        if (sortFilterValue === 'none') {
            table.setSorting([]);
            return;
        }

        const next = sortBy[sortFilterValue];
        table.setSorting([{id: next.id, desc: next.desc}]);
    }, [table, sortFilterValue]);

    const resetFilters = () => {
        setScreensFilterValue(defaults.screens);
        setSchedulesFilterValue(defaults.schedules);
        setSortFilterValue('none');
    };

    const reassignCandidates = React.useMemo(
        () => data.filter((channel) => channel.id !== deleteTarget?.id),
        [data, deleteTarget?.id],
    );

    const handleDelete = async () => {
        if (!deleteTarget) return;

        const needsReassign = deleteTarget.screensCount > 0;
        const result = await deleteChannel(deleteTarget.id, {
            reassignToChannelId: needsReassign ? reassignToChannelId || undefined : undefined,
        });

        if (!result.ok) {
            toast.error(result.message);
            return;
        }

        toast.success('Canal supprimé.');
        setIsDeleteOpen(false);
        setDeleteTarget(null);
        setReassignToChannelId('');
        router.refresh();
    };

    if (data.length === 0) {
        return <ChannelEmptyState canCreate={canManage} />;
    }

    return (
        <div className="flex min-w-0 max-w-full flex-col gap-4">
            <DataTableToolbar
                table={table}
                searchColumnId="searchText"
                searchPlaceholder="Rechercher un canal..."
                onReset={resetFilters}
                actions={
                    canManage ? (
                        <Button asChild>
                            <Link href="/dashboard/channels/new">Créer</Link>
                        </Button>
                    ) : null
                }
                filters={
                    <div className="flex flex-wrap items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    Filtres
                                    <ChevronDown />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-66">
                                <DropdownMenuLabel>Écrans rattachés</DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={screensFilterValue}
                                    onValueChange={(value) => setScreensFilterValue(value as ScreensFilter)}
                                >
                                    <DropdownMenuRadioItem value="all">Tous</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="with-screens">Avec écrans</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="without-screens">Sans écrans</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Planifications</DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={schedulesFilterValue}
                                    onValueChange={(value) => setSchedulesFilterValue(value as SchedulesFilter)}
                                >
                                    <DropdownMenuRadioItem value="all">Toutes</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="with-schedules">Avec
                                        planifications</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="without-schedules">Sans
                                        planification</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Tri</DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={sortFilterValue}
                                    onValueChange={(value) => setSortFilterValue(value as SortFilter)}
                                >
                                    <DropdownMenuRadioItem value="none">Aucun tri</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="updatedAt-desc">MAJ récentes</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="updatedAt-asc">MAJ anciennes</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="name-asc">Nom A-Z</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="name-desc">Nom Z-A</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="screens-desc">Plus
                                        d&apos;écrans</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="screens-asc">Moins
                                        d&apos;écrans</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="schedules-desc">
                                        Plus de planifications
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="schedules-asc">
                                        Moins de planifications
                                    </DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                }
            />

            <DataTableView table={table} />
            <DataTablePagination table={table} />

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce canal ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est définitive.
                            {deleteTarget && deleteTarget.screensCount > 0
                                ? ' Les écrans seront réaffectés au canal sélectionné.'
                                : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {deleteTarget && deleteTarget.screensCount > 0 ? (
                        <div className="grid gap-2">
                            <p className="text-muted-foreground text-sm">Canal de réaffectation des écrans</p>
                            <Select
                                value={reassignToChannelId}
                                onValueChange={setReassignToChannelId}
                                disabled={reassignCandidates.length === 0}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Sélectionnez un canal" />
                                </SelectTrigger>
                                <SelectContent align="start">
                                    {reassignCandidates.map((channel) => (
                                        <SelectItem key={channel.id} value={channel.id}>
                                            {channel.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {reassignCandidates.length === 0 ? (
                                <p className="text-destructive text-sm">
                                    Aucun autre canal disponible pour réaffecter les écrans.
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => startTransition(handleDelete)}
                            variant="destructive"
                            disabled={
                                isPending ||
                                (deleteTarget?.screensCount ?? 0) > 0 &&
                                (reassignToChannelId.length === 0 || reassignCandidates.length === 0)
                            }
                        >
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
