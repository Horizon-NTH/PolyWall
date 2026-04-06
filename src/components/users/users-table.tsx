'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteUser, toggleUserActive } from '@/actions/user-actions';
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
import { useCurrentReturnTo } from '@/hooks/use-current-return-to';
import { appendReturnTo } from '@/lib/return-to';
import { formatDate } from '@/lib/utils';
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
import { UserRole } from '@/generated/prisma/enums';

export type UserRow = {
    id: string;
    fullName: string;
    email: string;
    description: string;
    role: UserRole;
    active: boolean;
    createdAt: string;
};

type StatusFilter = 'all' | 'active' | 'inactive';

const statusFilter: FilterFn<UserRow> = (row, columnId, value) => {
    if (!value || value === 'all') return true;
    const isActive = row.getValue(columnId) as boolean;
    return value === 'active' ? isActive : !isActive;
};

type UsersTableProps = {
    data: UserRow[];
};

export function UsersTable({data}: UsersTableProps) {
    const router = useRouter();
    const currentReturnTo = useCurrentReturnTo();
    const [statusFilterValue, setStatusFilterValue] = React.useState<StatusFilter>('all');
    const [deleteTarget, setDeleteTarget] = React.useState<UserRow | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
    const [isPending, startTransition] = React.useTransition();

    const handleToggleActive = React.useCallback(async (user: UserRow) => {
        const result = await toggleUserActive(user.id);
        if (!result.ok) {
            toast.error(result.message);
            return;
        }

        toast.success(user.active ? 'Utilisateur désactivé.' : 'Utilisateur activé.');
        router.refresh();
    }, [router]);

    const openDeleteDialog = React.useCallback((user: UserRow) => {
        setDeleteTarget(user);
        setIsDeleteOpen(true);
    }, []);

    const columns = React.useMemo<ColumnDef<UserRow>[]>(() => [
        {
            id: 'searchText',
            accessorFn: (row) => `${row.fullName} ${row.email}`,
            enableHiding: true,
            enableSorting: false,
            enableColumnFilter: true,
        },
        {
            accessorKey: 'fullName',
            meta: {label: 'Nom'},
            header: ({column}) => (
                <DataTableColumnHeader column={column} title="Nom" />
            ),
            cell: ({row}) => (
                <div className="space-y-1 min-w-0 max-w-60">
                    <Link
                        href={appendReturnTo(`/dashboard/users/${row.original.id}`, currentReturnTo)}
                        className="text-foreground block truncate font-medium underline-offset-4 hover:underline"
                        title={row.original.fullName}
                    >
                        {row.getValue('fullName')}
                    </Link>
                    <div className="text-muted-foreground truncate text-sm">
                        {row.original.email}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'role',
            meta: {label: 'Rôle'},
            header: ({column}) => (
                <DataTableColumnHeader column={column} title="Rôle" />
            ),
            cell: () => (
                <div className="text-sm">Gestionnaire de contenu</div>
            ),
        },
        {
            accessorKey: 'active',
            meta: {label: 'Statut'},
            header: ({column}) => (
                <DataTableColumnHeader column={column} title="Statut" />
            ),
            cell: ({row}) => (
                <div className={row.original.active ? 'text-emerald-600 text-sm' : 'text-muted-foreground text-sm'}>
                    {row.original.active ? 'Actif' : 'Inactif'}
                </div>
            ),
            filterFn: statusFilter,
        },
        {
            accessorKey: 'createdAt',
            meta: {label: 'Créé le'},
            header: ({column}) => (
                <DataTableColumnHeader column={column} title="Créé le" />
            ),
            cell: ({row}) => (
                <div className="text-muted-foreground text-sm">
                    {formatDate(new Date(row.getValue('createdAt')))}
                </div>
            ),
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({row}) => {
                const user = row.original;

                return (
                    <DataTableRowActions>
                        <DropdownMenuItem asChild>
                            <Link href={appendReturnTo(`/dashboard/users/${user.id}`, currentReturnTo)}>
                                Voir la fiche
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={appendReturnTo(`/dashboard/users/${user.id}/edit`, currentReturnTo)}>
                                Modifier
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                            {user.active ? 'Désactiver' : 'Activer'}
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => openDeleteDialog(user)}>
                            Supprimer
                        </DropdownMenuItem>
                    </DataTableRowActions>
                );
            },
        },
    ], [currentReturnTo, handleToggleActive, openDeleteDialog]);

    const table = useDataTable({
        data,
        columns,
        initialPageSize: 10,
        enablePagination: true,
        initialColumnVisibility: {
            searchText: false,
        },
    });

    React.useEffect(() => {
        table
            .getColumn('active')
            ?.setFilterValue(statusFilterValue === 'all' ? undefined : statusFilterValue);
    }, [table, statusFilterValue]);

    const resetFilters = () => {
        setStatusFilterValue('all');
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const result = await deleteUser(deleteTarget.id);
        if (!result.ok) {
            toast.error(result.message);
            return;
        }

        toast.success('Utilisateur supprimé.');
        setIsDeleteOpen(false);
        setDeleteTarget(null);
        router.refresh();
    };

    return (
        <div className="flex min-w-0 max-w-full flex-col gap-4">
            <DataTableToolbar
                table={table}
                searchColumnId="searchText"
                searchPlaceholder="Rechercher un utilisateur..."
                onReset={resetFilters}
                actions={
                    <Button asChild>
                        <Link href="/dashboard/users/new">Créer</Link>
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
                            <DropdownMenuContent align="start" className="w-56">
                                <DropdownMenuLabel>Statut</DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={statusFilterValue}
                                    onValueChange={(value) => setStatusFilterValue(value as StatusFilter)}
                                >
                                    <DropdownMenuRadioItem value="all">
                                        Tous
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="active">
                                        Actifs
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="inactive">
                                        Inactifs
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
                        <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est définitive. Le compte sera supprimé.
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
