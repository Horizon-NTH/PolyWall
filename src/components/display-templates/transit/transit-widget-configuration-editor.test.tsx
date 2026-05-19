import type { ReactNode } from 'react';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import {
    TransitWidgetConfigurationEditor,
} from '@/components/display-templates/transit/transit-widget-configuration-editor';

vi.mock('@/components/ui/help-label', () => ({
    HelpLabel: ({children}: { children: ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/combobox', () => ({
    Combobox: ({
                   items,
                   multiple,
                   value,
                   inputValue,
                   onInputValueChange,
                   itemToStringLabel,
                   onValueChange,
                   onOpenChange,
               }: {
        items: string[];
        multiple?: boolean;
        value?: string | string[] | null;
        inputValue?: string;
        onInputValueChange?: (value: string, eventDetails: { reason: string }) => void;
        itemToStringLabel?: (value: string) => string;
        onValueChange?: (value: string | string[]) => void;
        onOpenChange?: (open: boolean) => void;
        children: ReactNode;
    }) => {
        if (multiple) {
            const selectedValues = Array.isArray(value) ? value : [];

            return (
                <div>
                    {items.map((item) => (
                        <label key={item}>
                            <input
                                type="checkbox"
                                checked={selectedValues.includes(item)}
                                onChange={() => {
                                    onValueChange?.(
                                        selectedValues.includes(item)
                                            ? selectedValues.filter((selected) => selected !== item)
                                            : [...selectedValues, item],
                                    );
                                }}
                            />
                            {itemToStringLabel?.(item) ?? item}
                        </label>
                    ))}
                </div>
            );
        }

        return (
            <div>
                <input
                    data-testid="mock-combobox-input"
                    value={inputValue ?? ''}
                    onChange={(event) => onInputValueChange?.(event.target.value, {reason: 'input-change'})}
                    onBlur={() => {
                        onOpenChange?.(false);
                    }}
                />
                <select
                    data-testid="mock-combobox"
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => onValueChange?.(event.target.value)}
                >
                    <option value="">Sélectionner</option>
                    {items.map((item) => (
                        <option key={item} value={item}>
                            {itemToStringLabel?.(item) ?? item}
                        </option>
                    ))}
                </select>
            </div>
        );
    },
    ComboboxChip: ({children}: { children: ReactNode }) => <span>{children}</span>,
    ComboboxChips: ({children}: { children: ReactNode }) => <>{children}</>,
    ComboboxChipsInput: () => null,
    ComboboxContent: ({children}: { children: ReactNode }) => <>{children}</>,
    ComboboxEmpty: ({children}: { children: ReactNode }) => <>{children}</>,
    ComboboxInput: () => null,
    ComboboxItem: ({children}: { children: ReactNode }) => <>{children}</>,
    ComboboxList: () => null,
    ComboboxValue: ({children}: { children: ReactNode }) => <>{children}</>,
    useComboboxAnchor: () => React.createRef<HTMLDivElement>(),
}));

vi.mock('@/components/ui/select', () => ({
    Select: ({children, value, onValueChange, disabled}: {
        children: ReactNode;
        value?: string;
        onValueChange?: (value: string) => void;
        disabled?: boolean;
    }) => (
        <select
            data-testid="mock-select"
            value={value}
            disabled={disabled}
            onChange={(event) => onValueChange?.(event.target.value)}
        >
            {children}
        </select>
    ),
    SelectTrigger: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectValue: ({placeholder}: { placeholder?: string }) => <option value="">{placeholder}</option>,
    SelectContent: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectGroup: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({value, children, disabled}: { value: string; children: ReactNode; disabled?: boolean }) => (
        <option value={value} disabled={disabled}>{children}</option>
    ),
}));

function TransitWidgetConfigurationEditorHarness() {
    const [configurationJson, setConfigurationJson] = React.useState<Record<string, unknown>>({});

    return (
        <>
            <TransitWidgetConfigurationEditor
                configurationJson={configurationJson}
                onChange={setConfigurationJson}
            />
            <output data-testid="configuration-json">{JSON.stringify(configurationJson)}</output>
        </>
    );
}

describe('TransitWidgetConfigurationEditor', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.startsWith('/api/transit/providers')) {
                return Response.json({
                    providers: [
                        {id: 'pan:test-network', label: 'Réseau test'},
                    ],
                });
            }

            return Response.json({
                provider: {id: 'pan:test-network', label: 'Réseau test'},
                stops: [
                    {
                        id: 'stop-1',
                        name: 'Université',
                        routeIds: ['route-1', 'route-2'],
                        destinations: ['DIJON Gare', 'TALANT Dullin'],
                    },
                ],
                routes: [
                    {
                        routeId: 'route-1',
                        shortName: 'T1',
                        longName: 'Tram T1',
                        type: 0,
                        color: '#be185d',
                        textColor: '#ffffff',
                    },
                    {
                        routeId: 'route-2',
                        shortName: 'L5',
                        longName: 'Bus L5',
                        type: 3,
                        color: '#ec4899',
                        textColor: '#ffffff',
                    },
                ],
                destinations: [
                    {routeId: 'route-1', destination: 'DIJON Gare'},
                    {routeId: 'route-2', destination: 'TALANT Dullin'},
                ],
                groups: [
                    {stopId: 'stop-1', routeId: 'route-1', destination: 'DIJON Gare'},
                    {stopId: 'stop-1', routeId: 'route-2', destination: 'TALANT Dullin'},
                ],
            });
        }));
    });

    it('lets users configure a transport widget from indexed provider data', async () => {
        render(<TransitWidgetConfigurationEditorHarness />);

        await waitFor(() => expect(screen.getByRole('option', {name: 'Réseau test'})).toBeInTheDocument());
        expect(screen.queryByText('Passages par élément')).not.toBeInTheDocument();
        fireEvent.change(screen.getByTestId('mock-combobox'), {target: {value: 'pan:test-network'}});

        await waitFor(() => expect(screen.getByLabelText(/Université/)).toBeInTheDocument());
        fireEvent.click(screen.getByLabelText(/Université/));
        fireEvent.click(screen.getByLabelText(/T1/));
        fireEvent.click(screen.getByLabelText('DIJON Gare'));

        expect(screen.getByText('1 élément')).toBeInTheDocument();
        expect(screen.getByTestId('configuration-json')).toHaveTextContent('"providerId":"pan:test-network"');
        expect(screen.getByTestId('configuration-json')).toHaveTextContent('"stopIds":["stop-1"]');
        expect(screen.getByTestId('configuration-json')).toHaveTextContent('"routeIds":["route-1"]');
        expect(screen.getByTestId('configuration-json')).toHaveTextContent('"destinations":["DIJON Gare"]');
    });

    it('clears the selected provider when the final typed value is invalid', async () => {
        render(<TransitWidgetConfigurationEditorHarness />);

        await waitFor(() => expect(screen.getByRole('option', {name: 'Réseau test'})).toBeInTheDocument());
        fireEvent.change(screen.getByTestId('mock-combobox'), {target: {value: 'pan:test-network'}});
        await waitFor(() => expect(screen.getByText('Passages par élément')).toBeInTheDocument());

        fireEvent.change(screen.getByTestId('mock-combobox-input'), {target: {value: 'inexistant'}});
        fireEvent.blur(screen.getByTestId('mock-combobox-input'));

        await waitFor(() => {
            expect(screen.queryByText('Passages par élément')).not.toBeInTheDocument();
            expect(screen.getByTestId('configuration-json')).toHaveTextContent('"providerId":""');
        });
    });
});
