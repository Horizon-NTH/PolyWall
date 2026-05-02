import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    DISPLAY_DEBUG_PRESET_STORAGE_KEY,
    getDisplayDebugScenario,
    isDisplayDebugPreset,
    loadDisplayDebugPreset,
    persistDisplayDebugPreset,
} from '@/lib/screens/display-debug';

describe('display-debug helpers', () => {
    beforeEach(() => {
        const storage = new Map<string, string>();
        Object.defineProperty(window, 'localStorage', {
            writable: true,
            value: {
                getItem: vi.fn((key: string) => storage.get(key) ?? null),
                setItem: vi.fn((key: string, value: string) => {
                    storage.set(key, value);
                }),
                removeItem: vi.fn((key: string) => {
                    storage.delete(key);
                }),
                clear: vi.fn(() => {
                    storage.clear();
                }),
            },
        });
    });

    it('recognizes valid presets', () => {
        expect(isDisplayDebugPreset('playing')).toBe(true);
        expect(isDisplayDebugPreset('unknown')).toBe(false);
    });

    it('loads and persists presets only in development', () => {
        vi.stubEnv('NODE_ENV', 'development');

        persistDisplayDebugPreset('degraded');
        expect(window.localStorage.getItem(DISPLAY_DEBUG_PRESET_STORAGE_KEY)).toBe('degraded');
        expect(loadDisplayDebugPreset()).toBe('degraded');

        persistDisplayDebugPreset('live');
        expect(window.localStorage.getItem(DISPLAY_DEBUG_PRESET_STORAGE_KEY)).toBeNull();

        vi.unstubAllEnvs();
    });

    it('returns tailored scenarios for template incompatibility and empty playlists', () => {
        const incompatible = getDisplayDebugScenario('template-incompatible');
        const emptyPlaylist = getDisplayDebugScenario('no-diffusable-playlist');

        expect(incompatible?.snapshot?.channel.template.zones).toHaveLength(2);
        expect(emptyPlaylist?.snapshot?.playlists[0]?.items).toEqual([]);
        expect(getDisplayDebugScenario('live')).toBeNull();
    });
});
