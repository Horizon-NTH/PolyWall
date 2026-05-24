'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxValue,
    useComboboxAnchor,
} from '@/components/ui/combobox';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { HelpLabel } from '@/components/ui/help-label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { parseTransitWidgetConfig } from '@/lib/transit/transit-config';
import {
    type TransitProviderIndex,
    type TransitProviderOption,
    type TransitRouteOption,
} from '@/lib/transit/transit-types';

type TransitWidgetConfigurationEditorProps = {
    configurationJson: Record<string, unknown>;
    onChange: (configurationJson: Record<string, unknown>) => void;
};

type ComboboxOption = {
    id: string;
    label: string;
};

const EMPTY_INDEX: TransitProviderIndex = {
    provider: {id: '', label: ''},
    stops: [],
    routes: [],
    destinations: [],
    groups: [],
};

function useTransitProviders(query: string) {
    const [providers, setProviders] = React.useState<TransitProviderOption[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        let cancelled = false;
        const timeout = window.setTimeout(() => {
            const loadProviders = async () => {
                setLoading(true);
                try {
                    const params = new URLSearchParams();
                    if (query.trim()) params.set('q', query.trim());

                    const response = await fetch(
                        params.size > 0 ? `/api/transit/providers?${params.toString()}` : '/api/transit/providers',
                        {cache: 'no-store'},
                    );
                    if (!response.ok) throw new Error('Transit providers request failed');

                    const data = await response.json() as { providers: TransitProviderOption[] };
                    if (!cancelled) setProviders(data.providers);
                } catch {
                    if (!cancelled) setProviders([]);
                } finally {
                    if (!cancelled) setLoading(false);
                }
            };

            void loadProviders();
        }, 250);

        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
        };
    }, [query]);

    return {providers, loading};
}

function useTransitProviderIndex(config: ReturnType<typeof parseTransitWidgetConfig>) {
    const [index, setIndex] = React.useState<TransitProviderIndex>(EMPTY_INDEX);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;

        const loadIndex = async () => {
            if (!config.providerId) {
                setIndex(EMPTY_INDEX);
                return;
            }

            setLoading(true);
            try {
                const params = new URLSearchParams({providerId: config.providerId});
                const response = await fetch(`/api/transit/index?${params.toString()}`, {cache: 'no-store'});
                if (!response.ok) throw new Error('Transit index request failed');

                const data = await response.json() as TransitProviderIndex;
                if (!cancelled) setIndex(data);
            } catch {
                if (!cancelled) setIndex(EMPTY_INDEX);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void loadIndex();
        return () => {
            cancelled = true;
        };
    }, [config.providerId]);

    return {index, loading};
}

function getAvailableRoutes(index: TransitProviderIndex, selectedStopIds: string[]) {
    if (selectedStopIds.length === 0) return index.routes;

    const routeIds = new Set<string>();
    for (const stop of index.stops) {
        if (!selectedStopIds.includes(stop.id)) continue;
        stop.routeIds.forEach((routeId) => routeIds.add(routeId));
    }

    return index.routes.filter((route) => routeIds.has(route.routeId));
}

function getAvailableDestinations(
    index: TransitProviderIndex,
    selectedStopIds: string[],
    selectedRouteIds: string[],
) {
    const destinationKeys = new Set<string>();

    return index.destinations.filter((destination) => {
        if (selectedRouteIds.length > 0 && !selectedRouteIds.includes(destination.routeId)) return false;

        const hasMatchingGroup = index.groups.some((group) =>
            group.routeId === destination.routeId &&
            group.destination === destination.destination &&
            (selectedStopIds.length === 0 || selectedStopIds.includes(group.stopId)),
        );
        if (!hasMatchingGroup || destinationKeys.has(destination.destination)) return false;

        destinationKeys.add(destination.destination);
        return true;
    });
}

function getSelectedGroupsCount(params: {
    routes: TransitRouteOption[];
    groups: TransitProviderIndex['groups'];
    selectedStopIds: string[];
    selectedRouteIds: string[];
    selectedDestinations: string[];
}) {
    const selectedRouteIds = params.selectedRouteIds.length > 0
        ? new Set(params.selectedRouteIds)
        : new Set(params.routes.map((route) => route.routeId));
    const selectedDestinations = params.selectedDestinations.length > 0
        ? new Set(params.selectedDestinations)
        : null;

    if (params.selectedStopIds.length === 0) return 0;

    return params.groups.filter((group) =>
        params.selectedStopIds.includes(group.stopId) &&
        selectedRouteIds.has(group.routeId) &&
        (!selectedDestinations || selectedDestinations.has(group.destination)),
    ).length;
}

function getSelectedLabels(selectedIds: string[], options: ComboboxOption[]) {
    const labelById = new Map(options.map((option) => [option.id, option.label]));
    return selectedIds.map((id) => ({id, label: labelById.get(id) ?? id}));
}

function resetTransitProviderConfiguration() {
    return {
        providerId: '',
        stopIds: [],
        routeIds: [],
        destinations: [],
    };
}

function TransitMultiCombobox({
                                  value,
                                  options,
                                  placeholder,
                                  emptyLabel,
                                  disabled,
                                  onChange,
                              }: {
    value: string[];
    options: ComboboxOption[];
    placeholder: string;
    emptyLabel: string;
    disabled?: boolean;
    onChange: (value: string[]) => void;
}) {
    const anchorRef = useComboboxAnchor();
    const labelById = React.useMemo(() => new Map(options.map((option) => [option.id, option.label])), [options]);

    return (
        <Combobox
            items={options.map((option) => option.id)}
            multiple
            value={value}
            itemToStringLabel={(id) => labelById.get(id) ?? id}
            disabled={disabled}
            onValueChange={onChange}
        >
            <ComboboxChips ref={anchorRef}>
                <ComboboxValue>
                    {getSelectedLabels(value, options).map((option) => (
                        <ComboboxChip key={option.id}>{option.label}</ComboboxChip>
                    ))}
                </ComboboxValue>
                <ComboboxChipsInput placeholder={placeholder} />
            </ComboboxChips>
            <ComboboxContent anchor={anchorRef}>
                <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
                <ComboboxList>
                    {(id) => {
                        return (
                            <ComboboxItem key={id} value={id}>
                                {labelById.get(id) ?? id}
                            </ComboboxItem>
                        );
                    }}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}

export function TransitWidgetConfigurationEditor({
                                                     configurationJson,
                                                     onChange,
                                                 }: TransitWidgetConfigurationEditorProps) {
    const config = parseTransitWidgetConfig(configurationJson);
    const [providerInputValue, setProviderInputValue] = React.useState('');
    const [providerInputDirty, setProviderInputDirty] = React.useState(false);
    const {providers, loading: providersLoading} = useTransitProviders(providerInputValue);
    const {index, loading: indexLoading} = useTransitProviderIndex(config);
    const selectedProvider = providers.find((provider) => provider.id === config.providerId);
    const selectedProviderLabel = selectedProvider?.label ??
        (index.provider.id === config.providerId ? index.provider.label : '');
    const providerDisplayValue = providerInputDirty
        ? providerInputValue
        : config.providerId ? selectedProviderLabel || providerInputValue : providerInputValue;
    const hasSelectedProvider = Boolean(config.providerId);
    const routes = getAvailableRoutes(index, config.stopIds);
    const destinations = getAvailableDestinations(index, config.stopIds, config.routeIds);
    const stopOptions = index.stops.map((stop) => ({
        id: stop.id,
        label: `${stop.name} (${stop.routeIds.length} ligne${stop.routeIds.length > 1 ? 's' : ''})`,
    }));
    const routeOptions = routes.map((route) => ({
        id: route.routeId,
        label: `${route.shortName || route.longName}${route.longName ? ` - ${route.longName}` : ''}`,
    }));
    const destinationOptions = destinations.map((destination) => ({
        id: destination.destination,
        label: destination.destination,
    }));
    const selectedGroupsCount = getSelectedGroupsCount({
        routes,
        groups: index.groups,
        selectedStopIds: config.stopIds,
        selectedRouteIds: config.routeIds,
        selectedDestinations: config.destinations,
    });

    const updateConfig = React.useCallback(
        (patch: Record<string, unknown>) => onChange({...configurationJson, ...patch}),
        [configurationJson, onChange],
    );
    const clearProvider = React.useCallback(() => {
        setProviderInputValue('');
        setProviderInputDirty(false);
        updateConfig(resetTransitProviderConfiguration());
    }, [updateConfig]);
    const commitProviderInput = React.useCallback(() => {
        if (!providerInputDirty) return;

        if (!config.providerId) {
            setProviderInputValue('');
            setProviderInputDirty(false);
            return;
        }

        if (providerInputValue.trim() !== selectedProviderLabel) {
            clearProvider();
            return;
        }

        setProviderInputDirty(false);
    }, [clearProvider, config.providerId, providerInputDirty, providerInputValue, selectedProviderLabel]);

    return (
        <FieldGroup className="flex flex-col gap-3">
            <Field>
                <FieldLabel>Réseau</FieldLabel>
                <Combobox
                    items={providers.map((provider) => provider.id)}
                    value={config.providerId || null}
                    inputValue={providerDisplayValue}
                    itemToStringLabel={(providerId) =>
                        providers.find((provider) => provider.id === providerId)?.label ??
                        (providerId === config.providerId ? selectedProviderLabel : '')
                    }
                    onInputValueChange={(inputValue, eventDetails) => {
                        if (eventDetails.reason === 'input-change') {
                            setProviderInputValue(inputValue);
                            setProviderInputDirty(true);
                            return;
                        }

                        if (eventDetails.reason === 'input-clear' || eventDetails.reason === 'clear-press') {
                            clearProvider();
                        }
                    }}
                    onOpenChange={(open) => {
                        if (!open) commitProviderInput();
                    }}
                    onValueChange={(providerId) => {
                        if (!providerId) {
                            clearProvider();
                            return;
                        }

                        const provider = providers.find((item) => item.id === providerId);
                        setProviderInputValue(provider?.label ?? '');
                        setProviderInputDirty(false);
                        updateConfig({
                            providerId,
                            stopIds: [],
                            routeIds: [],
                            destinations: [],
                        });
                    }}
                >
                    <ComboboxInput
                        placeholder={providersLoading ? 'Chargement des réseaux...' : 'Rechercher un réseau, une ville ou un territoire'}
                        showClear={hasSelectedProvider || providerDisplayValue.length > 0}
                        onBlur={commitProviderInput}
                    />
                    <ComboboxContent>
                        <ComboboxEmpty>Aucun réseau disponible.</ComboboxEmpty>
                        <ComboboxList>
                            {(providerId) => {
                                const provider = providers.find((item) => item.id === providerId);
                                return (
                                    <ComboboxItem key={providerId} value={providerId}>
                                        {provider?.label ?? providerId}
                                    </ComboboxItem>
                                );
                            }}
                        </ComboboxList>
                    </ComboboxContent>
                </Combobox>
            </Field>

            {indexLoading ? (
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            ) : null}

            {!indexLoading && hasSelectedProvider ? (
                <>
                    <Field>
                        <FieldLabel>Arrêts</FieldLabel>
                        <TransitMultiCombobox
                            value={config.stopIds}
                            options={stopOptions}
                            placeholder="Rechercher et ajouter des arrêts"
                            emptyLabel="Aucun arrêt disponible."
                            onChange={(stopIds) => updateConfig({
                                stopIds,
                                routeIds: [],
                                destinations: [],
                            })}
                        />
                    </Field>

                    <Field data-disabled={config.stopIds.length === 0}>
                        <FieldLabel>Lignes</FieldLabel>
                        <TransitMultiCombobox
                            value={config.routeIds}
                            options={routeOptions}
                            placeholder="Toutes les lignes des arrêts sélectionnés"
                            emptyLabel={config.stopIds.length === 0
                                ? 'Sélectionnez au moins un arrêt.'
                                : 'Aucune ligne disponible.'}
                            disabled={config.stopIds.length === 0}
                            onChange={(routeIds) => updateConfig({
                                routeIds,
                                destinations: [],
                            })}
                        />
                    </Field>

                    <Field data-disabled={config.stopIds.length === 0}>
                        <FieldLabel>Destinations</FieldLabel>
                        <TransitMultiCombobox
                            value={config.destinations}
                            options={destinationOptions}
                            placeholder="Toutes les destinations disponibles"
                            emptyLabel={config.stopIds.length === 0
                                ? 'Sélectionnez au moins un arrêt.'
                                : 'Aucune destination disponible.'}
                            disabled={config.stopIds.length === 0}
                            onChange={(selectedDestinations) => updateConfig({destinations: selectedDestinations})}
                        />
                    </Field>
                </>
            ) : null}

            {hasSelectedProvider ? <Separator /> : null}

            {hasSelectedProvider ? (
                <FieldGroup className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                    <Field>
                        <HelpLabel
                            help="Nombre de passages affichés pour chaque combinaison arrêt, ligne et destination.">
                            Passages par élément
                        </HelpLabel>
                        <Input
                            type="number"
                            min={1}
                            max={5}
                            value={config.maxDeparturesPerLine}
                            onChange={(event) => updateConfig({maxDeparturesPerLine: Number(event.target.value)})}
                        />
                    </Field>
                    <Field>
                        <HelpLabel
                            help="Horizontal convient aux bandeaux larges. Vertical convient aux zones étroites ou hautes.">
                            Disposition
                        </HelpLabel>
                        <Select
                            value={config.layoutDirection}
                            onValueChange={(layoutDirection) => updateConfig({layoutDirection})}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="start">
                                <SelectGroup>
                                    <SelectItem value="row">Horizontal</SelectItem>
                                    <SelectItem value="column">Vertical</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field>
                        <FieldLabel>Éléments affichés</FieldLabel>
                        <div className="flex h-9 items-center">
                            <Badge variant={selectedGroupsCount > 0 ? 'default' : 'secondary'}>
                                {selectedGroupsCount} élément{selectedGroupsCount > 1 ? 's' : ''}
                            </Badge>
                        </div>
                    </Field>
                </FieldGroup>
            ) : null}
        </FieldGroup>
    );
}
