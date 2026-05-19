import { describe, expect, it } from 'vitest';

import {
    getRelativeLuminance,
    isLightColor,
    isTransparentBackground,
    parseHexColor,
} from '@/lib/display-runtime/color-contrast';

describe('color contrast helpers', () => {
    it('parses short and long hex colors', () => {
        expect(parseHexColor('#fff')).toEqual({red: 255, green: 255, blue: 255});
        expect(parseHexColor('#123456')).toEqual({red: 18, green: 52, blue: 86});
    });

    it('rejects invalid colors', () => {
        expect(parseHexColor('transparent')).toBeNull();
        expect(parseHexColor('#12')).toBeNull();
    });

    it('detects light backgrounds by luminance', () => {
        expect(getRelativeLuminance({red: 255, green: 255, blue: 255})).toBe(1);
        expect(isLightColor('#ffffff')).toBe(true);
        expect(isLightColor('#020617')).toBe(false);
    });

    it('detects transparent background values', () => {
        expect(isTransparentBackground(undefined)).toBe(true);
        expect(isTransparentBackground('')).toBe(true);
        expect(isTransparentBackground(' transparent ')).toBe(true);
        expect(isTransparentBackground('#0000')).toBe(true);
        expect(isTransparentBackground('#00000000')).toBe(true);
        expect(isTransparentBackground('rgba(255, 255, 255, 0)')).toBe(true);
        expect(isTransparentBackground('hsla(0, 0%, 100%, 0.0)')).toBe(true);
    });

    it('keeps opaque background values as non-transparent', () => {
        expect(isTransparentBackground('#ffffff')).toBe(false);
        expect(isTransparentBackground('#ffffffcc')).toBe(false);
        expect(isTransparentBackground('rgba(255, 255, 255, 0.2)')).toBe(false);
    });
});
