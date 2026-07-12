import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(value: Date, dateStyle: 'medium' | 'full' | 'long' | 'short' | undefined = 'medium') {
    return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: dateStyle,
        timeZone: 'Europe/Paris',
    }).format(value);
}

export function timeStringToMinutes(value: string) {
    const [hours, minutes] = value.split(':').map(Number);
    return (hours * 60) + minutes;
}

export function minutesToTimeString(value: number) {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatBytes(bytes: number | null) {
    if (bytes === null) return 'N/A';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} Ko`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} Mo`;
    return `${(bytes / 1024 ** 3).toFixed(1)} Go`;
}

export function formatDurationSeconds(totalSeconds: number) {
    const safe = Math.max(0, Math.trunc(totalSeconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;

    const twoDigits = (value: number) => String(value).padStart(2, '0');
    if (hours > 0) {
        return `${hours}:${twoDigits(minutes)}:${twoDigits(seconds)}`;
    }

    return `${minutes}:${twoDigits(seconds)}`;
}

export function getRequestIp(request: Pick<Request, 'headers'>): string | null {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        const first = forwarded.split(',')[0]?.trim();
        if (first) {
            return first;
        }
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) {
        return cfIp;
    }

    return null;
}
