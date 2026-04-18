import { describe, expect, it } from 'vitest';

import { getPlaylistMetrics } from '@/lib/playlists/playlist-metrics';

describe('playlist-metrics', () => {
    it('excludes inactive media from diffusable duration', () => {
        expect(getPlaylistMetrics([
            {durationSeconds: 30, active: true},
            {durationSeconds: 45, active: false},
            {durationSeconds: 15, active: true},
        ])).toEqual({
            mediaCount: 3,
            activeMediaCount: 2,
            inactiveMediaCount: 1,
            totalDurationSeconds: 90,
            diffusableDurationSeconds: 45,
        });
    });
});
