export function computeServerOffsetMs(
    serverNow: string,
    startedAtMs: number,
    endedAtMs: number,
) {
    const serverNowMs = Date.parse(serverNow);
    if (Number.isNaN(serverNowMs)) {
        return null;
    }

    return serverNowMs - Math.round((startedAtMs + endedAtMs) / 2);
}
