export type RgbColor = {
    red: number;
    green: number;
    blue: number;
};

export function parseHexColor(value: string): RgbColor | null {
    const color = value.trim();
    const match = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(color);
    if (!match) return null;

    const hex = match[1];
    const normalized = hex.length === 3 || hex.length === 4
        ? hex.slice(0, 3).split('').map((char) => `${char}${char}`).join('')
        : hex.slice(0, 6);

    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);

    if (![red, green, blue].every(Number.isFinite)) return null;
    return {red, green, blue};
}

export function getRelativeLuminance({red, green, blue}: RgbColor) {
    const toLinear = (channel: number) => {
        const normalized = channel / 255;
        return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
    };

    return (0.2126 * toLinear(red)) + (0.7152 * toLinear(green)) + (0.0722 * toLinear(blue));
}

export function isLightColor(value: string, threshold = 0.55) {
    const color = parseHexColor(value);
    return color ? getRelativeLuminance(color) > threshold : false;
}

export function isTransparentBackground(value: unknown) {
    if (typeof value !== 'string') return true;

    const color = value.trim().toLowerCase();
    if (!color || color === 'transparent' || color === '#0000' || color === '#00000000') return true;

    const alphaMatch = /^(?:rgba|hsla)\(.+,\s*(0|0\.0+)\s*\)$/.exec(color);
    return Boolean(alphaMatch);
}
