import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getCoreRowModel, type ColumnDef, useReactTable } from '@tanstack/react-table';

import { DataTableRowActions } from '@/components/table/data-table-row-actions';
import { DataTableView } from '@/components/table/data-table';

type Row = { name: string };

function TableWrapper({data}: { data: Row[] }) {
    const columns: ColumnDef<Row>[] = [
        {
            accessorKey: 'name',
            header: 'Nom',
            cell: ({getValue}) => getValue(),
        },
    ];
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return <DataTableView table={table} />;
}

describe('DataTableView', () => {
    it('renders rows and headers', () => {
        render(<TableWrapper data={[{name: 'Org One'}]} />);

        expect(screen.getByText('Nom')).toBeInTheDocument();
        expect(screen.getByText('Org One')).toBeInTheDocument();
    });

    it('renders empty message when no rows', () => {
        function EmptyWrapper() {
            const columns: ColumnDef<Row>[] = [
                {
                    accessorKey: 'name',
                    header: 'Nom',
                    cell: ({getValue}) => getValue(),
                },
            ];
            const table = useReactTable({
                data: [],
                columns,
                getCoreRowModel: getCoreRowModel(),
            });

            return <DataTableView table={table} emptyMessage="Aucune donnée" />;
        }

        render(<EmptyWrapper />);

        expect(screen.getByText('Aucune donnée')).toBeInTheDocument();
    });
});

describe('DataTableRowActions', () => {
    it('renders the menu trigger', () => {
        render(
            <DataTableRowActions>
                <div>Action</div>
            </DataTableRowActions>,
        );

        expect(screen.getByRole('button', {name: 'Ouvrir le menu'})).toBeInTheDocument();
    });
});
