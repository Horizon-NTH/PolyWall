'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type ColumnDef, type FilterFn } from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';

import { deleteSchedule } from '@/actions/schedule-actions';
import { DataTableView } from '@/components/table/data-table';
import { DataTableColumnHeader } from '@/components/table/data-table-column-header';
import { DataTablePagination } from '@/components/table/data-table-pagination';
import { DataTableRowActions } from '@/components/table/data-table-row-actions';
import { DataTableToolbar } from '@/components/table/data-table-toolbar';
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
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrentReturnTo } from '@/hooks/use-current-return-to';
import { appendReturnTo } from '@/lib/return-to';
import { useDataTable } from '@/hooks/use-data-table';
import { ScheduleType } from '@/generated/prisma/enums';
import { type ScheduleViewModel } from '@/lib/schedules/schedule-view-model';
import { SCHEDULE_LIFECYCLE_LABELS, SCHEDULE_TYPE_LABELS } from '@/lib/schedules/schedule-utils';
import { cn, formatDate } from '@/lib/utils';
import { type ScheduleListFilterValues, scheduleListFilterSchema } from '@/schemas/schedule-schema';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type SortFilter = ScheduleListFilterValues['sort'] | 'none';
type TypeFilter = ScheduleListFilterValues['type'];
type ActiveFilter = ScheduleListFilterValues['active'];
type ProgressFilter = ScheduleListFilterValues['progress'];

const equalsFilter: FilterFn<ScheduleViewModel> = (row, columnId, value) => {
    if (!value || value === 'all') return true;
    return row.getValue(columnId) === value;
};

const activeFilter: FilterFn<ScheduleViewModel> = (row, _columnId, value) => {
    if (!value || value === 'all') return true;
    return value === 'active' ? row.original.active : !row.original.active;
};

const progressFilter: FilterFn<ScheduleViewModel> = (row, _columnId, value) => {
    if (!value || value === 'all') return true;
    return row.original.lifecycleStatus === value;
};

const sortBy: Record<Exclude<SortFilter, 'none'>, { id: string; desc: boolean }> = {
    'updatedAt-desc': {id: 'updatedAt', desc: true},
    'updatedAt-asc': {id: 'updatedAt', desc: false},
    'createdAt-desc': {id: 'createdAt', desc: true},
    'createdAt-asc': {id: 'createdAt', desc: false},
    'playlist-asc': {id: 'playlistName', desc: false},
    'playlist-desc': {id: 'playlistName', desc: true},
    'type-asc': {id: 'type', desc: false},
    'type-desc': {id: 'type', desc: true},
};

type SchedulesTableProps = {
    data: ScheduleViewModel[];
    canManage: boolean;
    returnTo?: string;
};

export function SchedulesTable({data, canManage, returnTo}: SchedulesTableProps) {
    const router = useRouter();
    const currentReturnTo = returnTo ?? useCurrentReturnTo();
    const defaults = scheduleListFilterSchema.parse({});
    const [typeFilterValue, setTypeFilterValue] = React.useState<TypeFilter>(defaults.type);
    const [activeFilterValue, setActiveFilterValue] = React.useState<ActiveFilter>(defaults.active);
    const [progressFilterValue, setProgressFilterValue] = React.useState<ProgressFilter>(defaults.progress);
    const [sortFilterValue, setSortFilterValue] = React.useState<SortFilter>('none');
    const [deleteTarget, setDeleteTarget] = React.useState<ScheduleViewModel | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
    const [isPending, startTransition] = React.useTransition();

    const columns = React.useMemo<ColumnDef<ScheduleViewModel>[]>(() => [
        {
            id: 'searchText',
            accessorFn: (row) => `${row.playlistName} ${row.type} ${row.dateLabel} ${row.daysLabel}`,
            enableHiding: true,
            enableSorting: false,
            enableColumnFilter: true,
        },
        {
            accessorKey: 'type',
            meta: {label: 'Type'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Type" />,
            cell: ({row}) => <Badge variant="secondary">{SCHEDULE_TYPE_LABELS[row.original.type]}</Badge>,
            filterFn: equalsFilter,
        },
        {
            accessorKey: 'playlistName',
            meta: {label: 'Programmation'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Programmation" />,
            cell: ({row}) => (
                <div className="flex min-w-0 max-w-70 flex-col gap-1">
                    <Link
                        href={appendReturnTo(`/dashboard/schedules/${row.original.id}`, currentReturnTo)}
                        className="text-foreground block truncate font-medium underline-offset-4 hover:underline"
                    >
                        {SCHEDULE_TYPE_LABELS[row.original.type]}
                    </Link>
                    <Tooltip delayDuration={700}>
                        <TooltipTrigger asChild>
                            <span className="text-muted-foreground max-w-full self-start truncate text-sm">
                                {row.original.playlistName}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            Playlist concernée par<br />cette programmation
                        </TooltipContent>
                    </Tooltip>
                </div>
            ),
        },
        {
            accessorKey: 'dateLabel',
            meta: {label: 'Fenêtre'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Fenêtre" />,
            cell: ({row}) => <div className="text-sm">{row.original.dateLabel}</div>,
        },
        {
            accessorKey: 'daysLabel',
            meta: {label: 'Jours'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Jours" />,
            cell: ({row}) => <div
                className="text-sm">{row.original.type === ScheduleType.EVENT ? 'Ponctuelle' : row.original.daysLabel}</div>,
        },
        {
            accessorKey: 'timeLabel',
            meta: {label: 'Horaire'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Horaire" />,
            cell: ({row}) => <div className="text-sm">{row.original.timeLabel}</div>,
        },
        {
            accessorKey: 'lifecycleStatus',
            meta: {label: 'Avancement'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Avancement" />,
            cell: ({row}) => (
                <Badge variant={row.original.lifecycleStatus === 'completed' ? 'outline' : 'secondary'}>
                    {SCHEDULE_LIFECYCLE_LABELS[row.original.lifecycleStatus]}
                </Badge>
            ),
            filterFn: progressFilter,
        },
        {
            accessorKey: 'active',
            meta: {label: 'Statut'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Statut" />,
            cell: ({row}) => (
                <Badge variant={row.original.active ? 'default' : 'secondary'}>
                    {row.original.active ? 'Active' : 'Inactive'}
                </Badge>
            ),
            filterFn: activeFilter,
        },
        {
            accessorKey: 'updatedAt',
            meta: {label: 'Mis à jour le'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Mis à jour le" />,
            cell: ({row}) => <div
                className="text-muted-foreground text-sm">{formatDate(new Date(row.original.updatedAt))}</div>,
        },
        {
            accessorKey: 'createdAt',
            meta: {label: 'Créé le'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Créé le" />,
            cell: ({row}) => <div
                className="text-muted-foreground text-sm">{formatDate(new Date(row.original.createdAt))}</div>,
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({row}) => (
                <DataTableRowActions>
                    <DropdownMenuItem asChild>
                        <Link href={appendReturnTo(`/dashboard/schedules/${row.original.id}`, currentReturnTo)}>
                            Voir la fiche
                        </Link>
                    </DropdownMenuItem>
                    {canManage ? (
                        <>
                            <DropdownMenuItem asChild>
                                <Link
                                    href={appendReturnTo(`/dashboard/schedules/${row.original.id}/edit`, currentReturnTo)}>
                                    Modifier
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={() => {
                                    setDeleteTarget(row.original);
                                    setIsDeleteOpen(true);
                                }}
                            >
                                Supprimer
                            </DropdownMenuItem>
                        </>
                    ) : null}
                </DataTableRowActions>
            ),
        },
    ], [canManage, currentReturnTo]);

    const table = useDataTable({
        data,
        columns,
        initialPageSize: 10,
        enablePagination: true,
        initialColumnVisibility: {
            searchText: false,
            type: false,
            updatedAt: false,
            createdAt: false,
        },
    });

    React.useEffect(() => {
        table.getColumn('type')?.setFilterValue(typeFilterValue === 'all' ? undefined : typeFilterValue);
    }, [table, typeFilterValue]);

    React.useEffect(() => {
        table.getColumn('active')?.setFilterValue(activeFilterValue === 'all' ? undefined : activeFilterValue);
    }, [table, activeFilterValue]);

    React.useEffect(() => {
        table.getColumn('lifecycleStatus')?.setFilterValue(progressFilterValue === 'all' ? undefined : progressFilterValue);
    }, [progressFilterValue, table]);

    React.useEffect(() => {
        if (sortFilterValue === 'none') {
            table.resetSorting();
            return;
        }

        table.setSorting([sortBy[sortFilterValue]]);
    }, [table, sortFilterValue]);

    const handleDelete = () => {
        if (!deleteTarget || isPending) return;

        startTransition(async () => {
            const result = await deleteSchedule(deleteTarget.id);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success('Programmation supprimée.');
            setIsDeleteOpen(false);
            setDeleteTarget(null);
            router.refresh();
        });
    };

    return (
        <>
            <div className="flex min-w-0 max-w-full flex-col gap-4">
                <DataTableToolbar
                    table={table}
                    searchColumnId="searchText"
                    searchPlaceholder="Rechercher une programmation..."
                    filters={(
                        <>
                            <Select value={activeFilterValue}
                                    onValueChange={(value) => setActiveFilterValue(value as ActiveFilter)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Statut" />
                                </SelectTrigger>
                                <SelectContent align="start">
                                    <SelectItem value="all">Tous les statuts</SelectItem>
                                    <SelectItem value="active">Actives</SelectItem>
                                    <SelectItem value="inactive">Inactives</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={progressFilterValue}
                                    onValueChange={(value) => setProgressFilterValue(value as ProgressFilter)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Avancement" />
                                </SelectTrigger>
                                <SelectContent align="start">
                                    <SelectItem value="all">Tous les états</SelectItem>
                                    <SelectItem value="ongoing">En cours</SelectItem>
                                    <SelectItem value="upcoming">À venir</SelectItem>
                                    <SelectItem value="completed">Terminées</SelectItem>
                                </SelectContent>
                            </Select>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        Type
                                        <ChevronDown />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuLabel>Type de programmation</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup value={typeFilterValue}
                                                            onValueChange={(value) => setTypeFilterValue(value as TypeFilter)}>
                                        <DropdownMenuRadioItem value="all">Tous</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem
                                            value={ScheduleType.RECURRING}>Récurrentes</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem
                                            value={ScheduleType.EVENT}>Événementielles</DropdownMenuRadioItem>
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
                                    <DropdownMenuRadioGroup value={sortFilterValue}
                                                            onValueChange={(value) => setSortFilterValue(value as SortFilter)}>
                                        <DropdownMenuRadioItem value="updatedAt-desc">Mis à jour
                                            récemment</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="updatedAt-asc">Mis à jour
                                            anciens</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="playlist-asc">Playlist A-Z</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="playlist-desc">Playlist
                                            Z-A</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="type-asc">Type A-Z</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="type-desc">Type Z-A</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}
                    onReset={() => {
                        setTypeFilterValue(defaults.type);
                        setActiveFilterValue(defaults.active);
                        setProgressFilterValue(defaults.progress);
                        setSortFilterValue('none');
                    }}
                />
                <DataTableView
                    table={table}
                    emptyMessage="Aucune programmation récurrente ou événementielle."
                    getRowClassName={(row) => cn(
                        row.original.lifecycleStatus === 'completed' && 'bg-muted/20 text-muted-foreground',
                    )}
                />
                <DataTablePagination table={table} />
            </div>

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cette programmation ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est définitive. Le canal retombera automatiquement sur la règle de priorité
                            inférieure.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} variant="destructive" disabled={isPending}>
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
