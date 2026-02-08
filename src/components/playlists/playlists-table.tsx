'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type ColumnDef, type FilterFn } from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';

import { deletePlaylist } from '@/actions/playlist-actions';
import { PlaylistEmptyState } from '@/components/playlists/playlist-empty-state';
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
import { formatDate, formatDurationSeconds } from '@/lib/utils';
import { type PlaylistListFilterValues, playlistListFilterSchema } from '@/schemas/playlist-schema';

export type PlaylistRow = {
    id: string;
    name: string;
    description: string;
    mediaCount: number;
    activeMediaCount: number;
    totalDurationSeconds: number;
    createdAt: string;
    updatedAt: string;
};

type InactiveFilter = PlaylistListFilterValues['inactive'];
type SortFilter = PlaylistListFilterValues['sort'] | 'none';

function pluralizeInactiveMedia(count: number) {
    const mediaLabel = `média${count > 1 ? 's' : ''}`;
    const inactiveLabel = `inactif${count > 1 ? 's' : ''}`;
    return `${count} ${mediaLabel} ${inactiveLabel}`;
}

const equalsFilter: FilterFn<PlaylistRow> = (row, columnId, value) => {
    if (!value || value === 'all') return true;
    return row.getValue(columnId) === value;
};

const inactiveFilter: FilterFn<PlaylistRow> = (row, _columnId, value) => {
    if (!value || value === 'all') return true;

    const playlist = row.original;
    const inactiveCount = playlist.mediaCount - playlist.activeMediaCount;
    if (value === 'with-inactive') return inactiveCount > 0;
    return inactiveCount === 0;
};

const sortBy: Record<Exclude<SortFilter, 'none'>, { id: string; desc: boolean }> = {
    'updatedAt-desc': {id: 'updatedAt', desc: true},
    'updatedAt-asc': {id: 'updatedAt', desc: false},
    'createdAt-desc': {id: 'createdAt', desc: true},
    'createdAt-asc': {id: 'createdAt', desc: false},
    'name-asc': {id: 'name', desc: false},
    'name-desc': {id: 'name', desc: true},
    'mediaCount-desc': {id: 'mediaCount', desc: true},
    'mediaCount-asc': {id: 'mediaCount', desc: false},
    'duration-desc': {id: 'totalDurationSeconds', desc: true},
    'duration-asc': {id: 'totalDurationSeconds', desc: false},
};

type PlaylistsTableProps = {
    data: PlaylistRow[];
};

export function PlaylistsTable({data}: PlaylistsTableProps) {
    const router = useRouter();
    const defaults = playlistListFilterSchema.parse({});
    const [inactiveFilterValue, setInactiveFilterValue] = React.useState<InactiveFilter>(defaults.inactive);
    const [sortFilterValue, setSortFilterValue] = React.useState<SortFilter>('none');
    const [deleteTarget, setDeleteTarget] = React.useState<PlaylistRow | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
    const [isPending, startTransition] = React.useTransition();

    const openDeleteDialog = React.useCallback((playlist: PlaylistRow) => {
        setDeleteTarget(playlist);
        setIsDeleteOpen(true);
    }, []);

    const columns = React.useMemo<ColumnDef<PlaylistRow>[]>(() => [
        {
            id: 'searchText',
            accessorFn: (row) => `${row.name} ${row.description}`,
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
                        href={`/dashboard/playlists/${row.original.id}`}
                        className="text-foreground block truncate font-medium underline-offset-4 hover:underline"
                        title={row.original.name}
                    >
                        {row.original.name}
                    </Link>
                    <div className="text-muted-foreground truncate text-sm">
                        {row.original.description}
                    </div>
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
            accessorKey: 'mediaCount',
            meta: {label: 'Médias'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Médias" />,
            cell: ({row}) => <div className="text-sm">{row.original.mediaCount}</div>,
        },
        {
            accessorKey: 'totalDurationSeconds',
            meta: {label: 'Durée'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Durée" />,
            cell: ({row}) => <div className="text-sm">{formatDurationSeconds(row.original.totalDurationSeconds)}</div>,
        },
        {
            id: 'inactiveStatus',
            accessorFn: (row) => row.mediaCount - row.activeMediaCount,
            meta: {label: 'Statut contenu'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Statut contenu" />,
            cell: ({row}) => {
                const inactiveCount = row.original.mediaCount - row.original.activeMediaCount;
                if (inactiveCount <= 0) {
                    return <div className="text-emerald-600 text-sm">Aucun inactif</div>;
                }

                return <div className="text-amber-700 text-sm">{pluralizeInactiveMedia(inactiveCount)}</div>;
            },
            filterFn: inactiveFilter,
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
                        <Link href={`/dashboard/playlists/${row.original.id}`}>Voir la fiche</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href={`/dashboard/playlists/${row.original.id}/edit`}>Modifier infos</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => openDeleteDialog(row.original)}>
                        Supprimer
                    </DropdownMenuItem>
                </DataTableRowActions>
            ),
        },
    ], [openDeleteDialog]);

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
        table.getColumn('inactiveStatus')
            ?.setFilterValue(inactiveFilterValue === 'all' ? undefined : inactiveFilterValue);
    }, [table, inactiveFilterValue]);

    React.useEffect(() => {
        if (sortFilterValue === 'none') {
            table.setSorting([]);
            return;
        }
        const next = sortBy[sortFilterValue];
        table.setSorting([{id: next.id, desc: next.desc}]);
    }, [table, sortFilterValue]);

    const resetFilters = () => {
        setInactiveFilterValue(defaults.inactive);
        setSortFilterValue('none');
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        const result = await deletePlaylist(deleteTarget.id);
        if (!result.ok) {
            toast.error(result.message);
            return;
        }

        toast.success('Playlist supprimée.');
        setIsDeleteOpen(false);
        setDeleteTarget(null);
        router.refresh();
    };

    if (data.length === 0) {
        return <PlaylistEmptyState />;
    }

    return (
        <div className="flex flex-col gap-4">
            <DataTableToolbar
                table={table}
                searchColumnId="searchText"
                searchPlaceholder="Rechercher une playlist..."
                onReset={resetFilters}
                actions={
                    <Button asChild>
                        <Link href="/dashboard/playlists/new">Créer</Link>
                    </Button>
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
                                <DropdownMenuLabel>Médias inactifs</DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={inactiveFilterValue}
                                    onValueChange={(value) => setInactiveFilterValue(value as InactiveFilter)}
                                >
                                    <DropdownMenuRadioItem value="all">Toutes</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="with-inactive">Avec inactifs</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="without-inactive">Sans
                                        inactifs</DropdownMenuRadioItem>
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
                                    <DropdownMenuRadioItem value="mediaCount-desc">
                                        Plus de médias
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="mediaCount-asc">
                                        Moins de médias
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="duration-desc">
                                        Durée décroissante
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="duration-asc">
                                        Durée croissante
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
                        <AlertDialogTitle>Supprimer cette playlist ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est définitive. Les éléments de la timeline seront supprimés.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => startTransition(handleDelete)}
                            variant="destructive"
                            disabled={isPending}
                        >
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
