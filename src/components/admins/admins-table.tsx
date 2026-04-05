'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteAdmin, toggleAdminActive } from '@/actions/admin-actions';
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
import { adminRoleOptions, getRoleLabel } from '@/lib/roles';

export type AdminRow = {
    id: string;
    fullName: string;
    email: string;
    description: string;
    role: UserRole;
    organizationId: string | null;
    organizationName: string | null;
    active: boolean;
    createdAt: string;
};

type OrganizationOption = {
    id: string;
    name: string;
};

type RoleFilter = 'all' | (typeof adminRoleOptions)[number]['value'];

type StatusFilter = 'all' | 'active' | 'inactive';

type OrganizationFilter = 'all' | string;


const equalsFilter: FilterFn<AdminRow> = (row, columnId, value) => {
    if (!value || value === 'all') return true;
    return row.getValue(columnId) === value;
};

const statusFilter: FilterFn<AdminRow> = (row, columnId, value) => {
    if (!value || value === 'all') return true;
    const isActive = row.getValue(columnId) as boolean;
    return value === 'active' ? isActive : !isActive;
};

type AdminsTableProps = {
    data: AdminRow[];
    organizations: OrganizationOption[];
};

export function AdminsTable({data, organizations}: AdminsTableProps) {
    const router = useRouter();
    const [roleFilter, setRoleFilter] = React.useState<RoleFilter>('all');
    const [statusFilterValue, setStatusFilterValue] = React.useState<StatusFilter>('all');
    const [organizationFilter, setOrganizationFilter] = React.useState<OrganizationFilter>('all');
    const [deleteTarget, setDeleteTarget] = React.useState<AdminRow | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
    const [isPending, startTransition] = React.useTransition();

    const handleToggleActive = React.useCallback(async (admin: AdminRow) => {
        const result = await toggleAdminActive(admin.id);
        if (!result.ok) {
            toast.error(result.message);
            return;
        }

        toast.success(admin.active ? 'Administrateur désactivé.' : 'Administrateur activé.');
        router.refresh();
    }, [router]);

    const openDeleteDialog = React.useCallback((admin: AdminRow) => {
        setDeleteTarget(admin);
        setIsDeleteOpen(true);
    }, []);

    const columns = React.useMemo<ColumnDef<AdminRow>[]>(() => [
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
                        href={`/dashboard/administrators/${row.original.id}`}
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
            cell: ({row}) => (
                <div className="text-sm">
                    {getRoleLabel(row.getValue('role') as UserRole)}
                </div>
            ),
            filterFn: equalsFilter,
        },
        {
            accessorKey: 'organizationName',
            meta: {label: 'Organisation'},
            header: ({column}) => (
                <DataTableColumnHeader column={column} title="Organisation" />
            ),
            cell: ({row}) => (
                <div className="text-sm max-w-40 truncate" title={row.original.organizationName ?? ''}>
                    {row.original.organizationName ?? 'Aucune'}
                </div>
            ),
        },
        {
            accessorKey: 'organizationId',
            filterFn: equalsFilter,
            enableHiding: true,
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
                const admin = row.original;

                return (
                    <DataTableRowActions>
                        <DropdownMenuItem asChild>
                            <Link href={`/dashboard/administrators/${admin.id}`}>
                                Voir la fiche
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/dashboard/administrators/${admin.id}/edit`}>
                                Modifier
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleActive(admin)}>
                            {admin.active ? 'Désactiver' : 'Activer'}
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => openDeleteDialog(admin)}>
                            Supprimer
                        </DropdownMenuItem>
                    </DataTableRowActions>
                );
            },
        },
    ], [handleToggleActive, openDeleteDialog]);

    const table = useDataTable({
        data,
        columns,
        initialPageSize: 10,
        enablePagination: true,
        initialColumnVisibility: {
            searchText: false,
            organizationId: false,
        },
    });

    React.useEffect(() => {
        table
            .getColumn('role')
            ?.setFilterValue(roleFilter === 'all' ? undefined : roleFilter);
    }, [table, roleFilter]);

    React.useEffect(() => {
        table
            .getColumn('active')
            ?.setFilterValue(statusFilterValue === 'all' ? undefined : statusFilterValue);
    }, [table, statusFilterValue]);

    React.useEffect(() => {
        table
            .getColumn('organizationId')
            ?.setFilterValue(organizationFilter === 'all' ? undefined : organizationFilter);
    }, [table, organizationFilter]);

    const resetFilters = () => {
        setRoleFilter('all');
        setStatusFilterValue('all');
        setOrganizationFilter('all');
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const result = await deleteAdmin(deleteTarget.id);
        if (!result.ok) {
            toast.error(result.message);
            return;
        }

        toast.success('Administrateur supprimé.');
        setIsDeleteOpen(false);
        setDeleteTarget(null);
        router.refresh();
    };

    return (
        <div className="flex min-w-0 max-w-full flex-col gap-4">
            <DataTableToolbar
                table={table}
                searchColumnId="searchText"
                searchPlaceholder="Rechercher un administrateur..."
                onReset={resetFilters}
                actions={
                    <Button asChild>
                        <Link href="/dashboard/administrators/new">Créer</Link>
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
                            <DropdownMenuContent align="start" className="w-64">
                                <DropdownMenuLabel>Rôle</DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={roleFilter}
                                    onValueChange={(value) => setRoleFilter(value as RoleFilter)}
                                >
                                    <DropdownMenuRadioItem value="all">
                                        Tous
                                    </DropdownMenuRadioItem>
                                    {adminRoleOptions.map((option) => (
                                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                                            {option.value === UserRole.PLATFORM_SUPER_ADMIN
                                                ? 'Super admins'
                                                : 'Admins organisation'}
                                        </DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                                <DropdownMenuSeparator />
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
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Organisation</DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={organizationFilter}
                                    onValueChange={(value) => setOrganizationFilter(value as OrganizationFilter)}
                                >
                                    <DropdownMenuRadioItem value="all">
                                        Toutes
                                    </DropdownMenuRadioItem>
                                    {organizations.map((org) => (
                                        <DropdownMenuRadioItem key={org.id} value={org.id}>
                                            {org.name}
                                        </DropdownMenuRadioItem>
                                    ))}
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
                        <AlertDialogTitle>Supprimer cet administrateur ?</AlertDialogTitle>
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
