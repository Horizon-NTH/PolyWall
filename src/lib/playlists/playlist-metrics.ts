export type PlaylistMetricItem = {
    durationSeconds: number;
    active: boolean;
};

export type PlaylistMetrics = {
    mediaCount: number;
    activeMediaCount: number;
    inactiveMediaCount: number;
    totalDurationSeconds: number;
    diffusableDurationSeconds: number;
};

export function getPlaylistMetrics(items: PlaylistMetricItem[]): PlaylistMetrics {
    let totalDurationSeconds = 0;
    let diffusableDurationSeconds = 0;
    let activeMediaCount = 0;

    for (const item of items) {
        totalDurationSeconds += item.durationSeconds;

        if (item.active) {
            activeMediaCount += 1;
            diffusableDurationSeconds += item.durationSeconds;
        }
    }

    const mediaCount = items.length;

    return {
        mediaCount,
        activeMediaCount,
        inactiveMediaCount: mediaCount - activeMediaCount,
        totalDurationSeconds,
        diffusableDurationSeconds,
    };
}
