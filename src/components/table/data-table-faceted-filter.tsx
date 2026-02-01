'use client';

import { type Column } from '@tanstack/react-table';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type FacetedOption = {
    label: string;
    value: string;
};

interface DataTableFacetedFilterProps<TData, TValue> {
    column?: Column<TData, TValue>;
    title?: string;
    options: FacetedOption[];
}

export function DataTableFacetedFilter<TData, TValue>({
                                                          column,
                                                          title,
                                                          options,
                                                      }: DataTableFacetedFilterProps<TData, TValue>) {
    const selectedValues = new Set(column?.getFilterValue() as string[]);
    const hasSelection = selectedValues.size > 0;

    const toggleValue = (value: string) => {
        if (!column) return;
        if (selectedValues.has(value)) {
            selectedValues.delete(value);
        } else {
            selectedValues.add(value);
        }
        const filterValues = Array.from(selectedValues);
        column.setFilterValue(filterValues.length ? filterValues : undefined);
    };

    const clearFilters = () => column?.setFilterValue(undefined);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                    <PlusCircle />
                    {title}
                    {hasSelection ? ` (${selectedValues.size})` : null}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>{title}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {options.map((option) => (
                    <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={selectedValues.has(option.value)}
                        onCheckedChange={() => toggleValue(option.value)}
                    >
                        {option.label}
                    </DropdownMenuCheckboxItem>
                ))}
                {hasSelection ? (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={clearFilters}>Effacer</DropdownMenuItem>
                    </>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
