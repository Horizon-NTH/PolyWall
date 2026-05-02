import { describe, expect, it } from 'vitest';

import { formatDateOnlyLocal, formatDateOnlyParts, formatDateOnlyUTC, parseDateOnlyString } from '@/lib/date';

describe('date helpers', () => {
    it('formats date-only parts consistently', () => {
        expect(formatDateOnlyParts({year: 2026, month: 4, day: 5})).toBe('2026-04-05');
    });

    it('formats local and UTC dates to yyyy-mm-dd', () => {
        const value = new Date('2026-04-05T12:34:56.000Z');

        expect(formatDateOnlyLocal(value)).toBeTypeOf('string');
        expect(formatDateOnlyUTC(value)).toBe('2026-04-05');
    });

    it('returns null for nullish nullable helpers', () => {
        expect(formatDateOnlyLocal(null)).toBeNull();
        expect(formatDateOnlyLocal(undefined)).toBeNull();
        expect(formatDateOnlyUTC(null)).toBeNull();
        expect(formatDateOnlyUTC(undefined)).toBeNull();
        expect(parseDateOnlyString(null)).toBeNull();
        expect(parseDateOnlyString(undefined)).toBeNull();
    });

    it('parses a date-only string', () => {
        const date = parseDateOnlyString('2026-04-05');

        expect(date).toBeInstanceOf(Date);
        expect(date.getFullYear()).toBe(2026);
        expect(date.getMonth()).toBe(3);
        expect(date.getDate()).toBe(5);
    });
});
