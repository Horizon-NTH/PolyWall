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
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return <DataTableView table={table} />;
}

function StickyActionsTableWrapper() {
    const columns: ColumnDef<Row>[] = [
        {
            accessorKey: 'name',
            header: 'Nom',
            cell: ({getValue}) => getValue(),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: () => '...',
        },
    ];
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: [{name: 'Org One'}],
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

    it('keeps horizontal overflow scoped to the table container', () => {
        const {container} = render(<TableWrapper data={[{name: 'Org One'}]} />);

        const frame = container.querySelector('.min-w-0.max-w-full.overflow-hidden.rounded-md.border');
        const scrollArea = container.querySelector('.w-full.min-w-0.max-w-full.overflow-x-auto');
        const table = container.querySelector('table');

        expect(frame).toBeTruthy();
        expect(scrollArea).toBeTruthy();
        expect(table).toHaveClass('min-w-full', 'w-max');
    });

    it('keeps the actions column sticky on the right', () => {
        render(<StickyActionsTableWrapper />);

        const headerCell = screen.getByRole('columnheader', {name: 'Actions'});
        const bodyCell = screen.getByText('...').closest('td');

        expect(headerCell).toHaveClass('sticky', 'right-0');
        expect(bodyCell).toHaveClass('sticky', 'right-0');
        expect(headerCell).not.toHaveClass('border-l');
        expect(bodyCell).not.toHaveClass('border-l');
        expect(headerCell).toHaveClass('before:bg-gradient-to-r', 'before:to-background');
        expect(bodyCell).toHaveClass('before:bg-gradient-to-r', 'before:to-background');
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
            // eslint-disable-next-line react-hooks/incompatible-library
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
