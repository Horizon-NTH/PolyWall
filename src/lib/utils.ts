import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(value: Date, dateStyle: 'medium' | 'full' | 'long' | 'short' | undefined = 'medium') {
    return new Intl.DateTimeFormat('fr-FR', {dateStyle: dateStyle}).format(value);
}