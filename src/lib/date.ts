export type DateOnlyParts = {
    year: number;
    month: number;
    day: number;
};

function padTwoDigits(value: number) {
    return String(value).padStart(2, '0');
}

export function formatDateOnlyParts(value: DateOnlyParts) {
    return `${value.year}-${padTwoDigits(value.month)}-${padTwoDigits(value.day)}`;
}

export function formatDateOnlyLocal(value: Date): string;
export function formatDateOnlyLocal(value: Date | null | undefined): string | null;
export function formatDateOnlyLocal(value: Date | null | undefined) {
    if (!value) return null;

    return formatDateOnlyParts({
        year: value.getFullYear(),
        month: value.getMonth() + 1,
        day: value.getDate(),
    });
}

export function formatDateOnlyUTC(value: Date): string;
export function formatDateOnlyUTC(value: Date | null | undefined): string | null;
export function formatDateOnlyUTC(value: Date | null | undefined) {
    if (!value) return null;

    return formatDateOnlyParts({
        year: value.getUTCFullYear(),
        month: value.getUTCMonth() + 1,
        day: value.getUTCDate(),
    });
}

export function parseDateOnlyString(value: string): Date;
export function parseDateOnlyString(value: string | null | undefined): Date | null;
export function parseDateOnlyString(value: string | null | undefined) {
    if (!value) return null;

    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
}
