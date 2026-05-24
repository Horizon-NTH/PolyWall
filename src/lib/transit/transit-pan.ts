import 'server-only';

export type PanDatasetResource = {
    id?: number | string;
    datagouv_id?: string;
    title?: string;
    format?: string;
    type?: string;
    is_available?: boolean;
    url?: string;
    original_url?: string;
};

export type PanDataset = {
    id: string;
    title?: string;
    covered_area?: Array<{ nom?: string }>;
    resources?: PanDatasetResource[];
};

export const PAN_API_DATASETS_URL = 'https://transport.data.gouv.fr/api/datasets';

export function normalizePanResourceFormat(value: string | undefined) {
    return value?.trim().toLocaleLowerCase('fr-FR') ?? '';
}

export function getPanResourceUrl(resource: PanDatasetResource) {
    return resource.url || resource.original_url || '';
}

export function isAvailableGtfsScheduleResource(resource: PanDatasetResource) {
    return (
        resource.is_available !== false &&
        normalizePanResourceFormat(resource.format) === 'gtfs' &&
        Boolean(getPanResourceUrl(resource))
    );
}
