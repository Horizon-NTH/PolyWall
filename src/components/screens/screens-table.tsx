'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import { Check, ChevronDown, X } from 'lucide-react';

import { deleteScreen, reactivateScreen, revokeScreen } from '@/actions/screen-actions';
import { ScreenEmptyState } from '@/components/screens/screen-empty-state';
import { DataTableColumnHeader } from '@/components/table/data-table-column-header';
import { DataTablePagination } from '@/components/table/data-table-pagination';
import { DataTableRowActions } from '@/components/table/data-table-row-actions';
import { DataTableToolbar } from '@/components/table/data-table-toolbar';
import { DataTableView } from '@/components/table/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useDataTable } from '@/hooks/use-data-table';
import { formatDate } from '@/lib/utils';
import { type ScreenListFilterValues, screenListFilterSchema } from '@/schemas/screen-schema';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScreenStatus } from '@/generated/prisma/enums';
import { cn } from '@/lib/utils';

export type ScreenRow = {
    id: string;
    name: string;
    location: string;
    channelId: string | null;
    channelName: string | null;
    status: ScreenStatus;
    interactive: boolean;
    lastSeenAt: string | null;
    updatedAt: string;
    createdAt: string;
};

type SortFilter = ScreenListFilterValues['sort'] | 'none';
type InteractiveFilter = ScreenListFilterValues['interactive'];
type TabValue = 'PENDING' | 'ACTIVE' | 'REVOKED';

type ChannelOption = {
    id: string;
    name: string;
};

type ScreensTableProps = {
    data: ScreenRow[];
    canManage: boolean;
    channels: ChannelOption[];
};

const sortBy: Record<Exclude<SortFilter, 'none'>, { id: string; desc: boolean }> = {
    'updatedAt-desc': {id: 'updatedAt', desc: true},
    'updatedAt-asc': {id: 'updatedAt', desc: false},
    'lastSeenAt-desc': {id: 'lastSeenAtSort', desc: true},
    'lastSeenAt-asc': {id: 'lastSeenAtSort', desc: false},
    'name-asc': {id: 'name', desc: false},
    'name-desc': {id: 'name', desc: true},
    'channel-asc': {id: 'channelNameSort', desc: false},
    'channel-desc': {id: 'channelNameSort', desc: true},
};

export function ScreensTable({data, canManage, channels}: ScreensTableProps) {
    const router = useRouter();
    const defaults = screenListFilterSchema.parse({});
    const [activeTab, setActiveTab] = React.useState<TabValue>('ACTIVE');
    const [interactiveFilterValue, setInteractiveFilterValue] = React.useState<InteractiveFilter>(defaults.interactive);
    const [sortFilterValue, setSortFilterValue] = React.useState<SortFilter>('none');
    const [deleteTarget, setDeleteTarget] = React.useState<ScreenRow | null>(null);
    const [revokeTarget, setRevokeTarget] = React.useState<ScreenRow | null>(null);
    const [reactivateTarget, setReactivateTarget] = React.useState<ScreenRow | null>(null);
    const [reactivateChannelId, setReactivateChannelId] = React.useState('');
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
    const [isRevokeOpen, setIsRevokeOpen] = React.useState(false);
    const [isReactivateOpen, setIsReactivateOpen] = React.useState(false);
    const [isPending, startTransition] = React.useTransition();

    const columns = React.useMemo<ColumnDef<ScreenRow>[]>(() => [
        {
            id: 'searchText',
            accessorFn: (row) => `${row.name} ${row.location} ${row.channelName ?? ''}`,
            enableHiding: true,
            enableSorting: false,
            enableColumnFilter: true,
        },
        {
            accessorKey: 'name',
            meta: {label: 'Nom'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Nom" />,
            cell: ({row}) => (
                <div className="flex min-w-0 max-w-70 flex-col gap-1">
                    <Link
                        href={`/dashboard/screens/${row.original.id}`}
                        className="text-foreground block truncate font-medium underline-offset-4 hover:underline"
                        title={row.original.name}
                    >
                        {row.original.name}
                    </Link>
                    <div className="text-muted-foreground truncate text-sm">{row.original.location}</div>
                </div>
            ),
        },
        {
            accessorKey: 'location',
            meta: {label: 'Localisation'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Localisation" />,
            cell: ({row}) => <div className="text-sm max-w-70 truncate">{row.original.location}</div>,
        },
        {
            accessorKey: 'channelName',
            id: 'channelNameSort',
            meta: {label: 'Canal'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Canal" />,
            cell: ({row}) => <div className="text-sm">{row.original.channelName ?? 'Aucun'}</div>,
        },
        {
            accessorKey: 'interactive',
            meta: {label: 'Interactif'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Interactif" />,
            cell: ({row}) => <div className="text-sm">{row.original.interactive ? 'Oui' : 'Non'}</div>,
            filterFn: (row, columnId, value) => {
                if (!value || value === 'all') return true;
                const v = row.getValue(columnId) as boolean;
                return value === 'interactive' ? v : !v;
            },
        },
        {
            accessorKey: 'lastSeenAt',
            id: 'lastSeenAtSort',
            meta: {label: 'Dernière activité'},
            header: ({column}) => <DataTableColumnHeader column={column} title="Dernière activité" />,
            cell: ({row}) => (
                <div className="text-muted-foreground text-sm">
                    {row.original.lastSeenAt ? formatDate(new Date(row.original.lastSeenAt)) : 'Inconnue'}
                </div>
            ),
            sortingFn: (a, b, columnId) => {
                const va = a.getValue(columnId) as string | null;
                const vb = b.getValue(columnId) as string | null;
                return new Date(va ?? 0).getTime() - new Date(vb ?? 0).getTime();
            },
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
                canManage && row.original.status === ScreenStatus.PENDING ? (
                    <div className="flex items-center gap-1">
                        <Button asChild variant="outline" size="icon" aria-label="Valider l'écran">
                            <Link href={`/dashboard/screens/${row.original.id}/edit`}>
                                <Check />
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            aria-label="Supprimer l'écran"
                            onClick={() => {
                                setDeleteTarget(row.original);
                                setIsDeleteOpen(true);
                            }}
                        >
                            <X />
                        </Button>
                    </div>
                ) : (
                    <DataTableRowActions>
                        <DropdownMenuItem asChild>
                            <Link href={`/dashboard/screens/${row.original.id}`}>Voir la fiche</Link>
                        </DropdownMenuItem>
                        {canManage ? (
                            <>
                                <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/screens/${row.original.id}/edit`}>
                                        {row.original.status === ScreenStatus.PENDING ? 'Valider' : 'Modifier'}
                                    </Link>
                                </DropdownMenuItem>
                                {row.original.status !== ScreenStatus.REVOKED ? (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setRevokeTarget(row.original);
                                            setIsRevokeOpen(true);
                                        }}
                                    >
                                        Révoquer
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setReactivateTarget(row.original);
                                            setReactivateChannelId(row.original.channelId ?? '');
                                            setIsReactivateOpen(true);
                                        }}
                                    >
                                        Réactiver
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
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
                )
            ),
        },
    ], [canManage]);

    const filteredData = React.useMemo(
        () => data.filter((row) => row.status === activeTab),
        [data, activeTab],
    );
    const pendingCount = React.useMemo(
        () => data.filter((row) => row.status === ScreenStatus.PENDING).length,
        [data],
    );

    const table = useDataTable({
        data: filteredData,
        columns,
        initialPageSize: 10,
        enablePagination: true,
        initialColumnVisibility: {
            searchText: false,
            location: false,
            createdAt: false,
        },
    });

    React.useEffect(() => {
        table.getColumn('interactive')?.setFilterValue(interactiveFilterValue === 'all' ? undefined : interactiveFilterValue);
    }, [table, interactiveFilterValue]);

    React.useEffect(() => {
        if (sortFilterValue === 'none') {
            table.setSorting([]);
            return;
        }

        const next = sortBy[sortFilterValue];
        table.setSorting([{id: next.id, desc: next.desc}]);
    }, [table, sortFilterValue]);

    const resetFilters = () => {
        setInteractiveFilterValue(defaults.interactive);
        setSortFilterValue('none');
    };
    const hasExtraFilters =
        interactiveFilterValue !== defaults.interactive ||
        sortFilterValue !== 'none';

    const handleDelete = () => {
        if (!deleteTarget) return;

        startTransition(async () => {
            const result = await deleteScreen(deleteTarget.id);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success('Écran supprimé.');
            setIsDeleteOpen(false);
            setDeleteTarget(null);
            router.refresh();
        });
    };

    const handleRevoke = () => {
        if (!revokeTarget) return;

        startTransition(async () => {
            const result = await revokeScreen(revokeTarget.id);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success('Écran révoqué.');
            setIsRevokeOpen(false);
            setRevokeTarget(null);
            router.refresh();
        });
    };

    const handleReactivate = () => {
        if (!reactivateTarget || !reactivateChannelId) return;

        startTransition(async () => {
            const result = await reactivateScreen(reactivateTarget.id, {channelId: reactivateChannelId});
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success('Écran réactivé.');
            setIsReactivateOpen(false);
            setReactivateTarget(null);
            setReactivateChannelId('');
            router.refresh();
        });
    };

    if (data.length === 0) {
        return <ScreenEmptyState />;
    }

    return (
        <div className="flex min-w-0 max-w-full flex-col gap-4">
            <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as TabValue)}>
                <TabsList>
                    <TabsTrigger value="PENDING" className="gap-2">
                        En attente
                        {pendingCount > 0 ? (
                            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                                {pendingCount}
                            </Badge>
                        ) : null}
                    </TabsTrigger>
                    <TabsTrigger value="ACTIVE">Actifs</TabsTrigger>
                    <TabsTrigger value="REVOKED">Révoqués</TabsTrigger>
                </TabsList>
            </Tabs>

            <DataTableToolbar
                table={table}
                searchColumnId="searchText"
                searchPlaceholder="Rechercher un écran..."
                onReset={resetFilters}
                showReset={hasExtraFilters || table.getState().columnFilters.length > 0 || table.getState().sorting.length > 0}
                actions={null}
                filters={
                    <div className="flex flex-wrap items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    Filtres
                                    <ChevronDown />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-64">
                                <DropdownMenuLabel>Interactif</DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={interactiveFilterValue}
                                    onValueChange={(value) => setInteractiveFilterValue(value as InteractiveFilter)}
                                >
                                    <DropdownMenuRadioItem value="all">Tous</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="interactive">Interactifs</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="non-interactive">Non
                                        interactifs</DropdownMenuRadioItem>
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
                                    <DropdownMenuRadioItem value="lastSeenAt-desc">Activité
                                        récente</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="lastSeenAt-asc">Activité
                                        ancienne</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="name-asc">Nom A-Z</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="name-desc">Nom Z-A</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                }
            />

            <DataTableView
                table={table}
                getRowClassName={(row) =>
                    cn(row.original.status === ScreenStatus.REVOKED && 'bg-muted/40 text-muted-foreground')
                }
            />
            <DataTablePagination table={table} />

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cet écran ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est définitive.
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

            <AlertDialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Révoquer cet écran ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            L&apos;écran n&apos;aura plus accès à l&apos;affichage jusqu&apos;à réactivation.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRevoke} disabled={isPending}>
                            Révoquer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isReactivateOpen} onOpenChange={setIsReactivateOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Réactiver cet écran ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Sélectionnez un canal pour réactiver l&apos;écran.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="grid gap-2">
                        <Select value={reactivateChannelId} onValueChange={setReactivateChannelId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Sélectionnez un canal" />
                            </SelectTrigger>
                            <SelectContent align="start">
                                {channels.map((channel) => (
                                    <SelectItem key={channel.id} value={channel.id}>
                                        {channel.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReactivate} disabled={isPending || !reactivateChannelId}>
                            Réactiver
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
