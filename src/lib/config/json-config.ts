export function asConfigurationRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

export function getStringConfig(config: Record<string, unknown>, key: string, fallback = '') {
    const value = config[key];
    return typeof value === 'string' ? value : fallback;
}

export function getRequiredStringConfig(config: Record<string, unknown>, key: string, fallback: string) {
    const value = getStringConfig(config, key, fallback);
    return value.trim().length > 0 ? value : fallback;
}

export function getNumberConfig(config: Record<string, unknown>, key: string, fallback: number) {
    const value = config[key];
    return typeof value === 'number' ? value : fallback;
}
