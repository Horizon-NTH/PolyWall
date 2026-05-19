export type TransitWidgetConfig = {
    providerId: string;
    stopIds: string[];
    routeIds: string[];
    destinations: string[];
    maxDeparturesPerLine: number;
    layoutDirection: 'row' | 'column';
};

export type TransitLine = {
    routeId: string;
    shortName: string;
    longName: string;
    type: number;
    color: string;
    textColor: string;
};

export type TransitDeparture = {
    stopId: string;
    stopName: string;
    line: TransitLine;
    destination: string;
    departureTime: string;
    realtime: boolean;
};

export type TransitDeparturesResult = {
    departures: TransitDeparture[];
};

export type TransitProviderOption = {
    id: string;
    label: string;
    searchText?: string;
};

export type TransitStopOption = {
    id: string;
    name: string;
    routeIds: string[];
    destinations: string[];
};

export type TransitRouteOption = TransitLine;

export type TransitDestinationOption = {
    routeId: string;
    destination: string;
};

export type TransitDisplayGroupOption = {
    stopId: string;
    routeId: string;
    destination: string;
};

export type TransitProviderIndex = {
    provider: {
        id: string;
        label: string;
    };
    stops: TransitStopOption[];
    routes: TransitRouteOption[];
    destinations: TransitDestinationOption[];
    groups: TransitDisplayGroupOption[];
};
