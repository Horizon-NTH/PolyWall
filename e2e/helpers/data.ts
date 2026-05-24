export function uniqueE2eName(projectName: string, subject: string, suffix?: string) {
    return [
        'PW E2E',
        projectName,
        subject,
        Date.now(),
        suffix,
    ].filter(Boolean).join(' ');
}

export function uniqueE2eEmail(projectName: string, suffix: string) {
    const safeProjectName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const safeSuffix = suffix.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    return `pw-e2e-${safeProjectName}-${Date.now()}-${safeSuffix}@polywall.test`;
}

export function extractDashboardEntityId(url: string, resource: string) {
    const pathname = new URL(url, 'http://localhost').pathname;
    const match = pathname.match(new RegExp(`/dashboard/${resource}/(?!new$)(?!.*?/edit$)([^/]+)$`));

    if (!match?.[1]) {
        throw new Error(`Impossible de lire l'ID ${resource} depuis l'URL: ${url}`);
    }

    return match[1];
}

export function createCleanupTracker<T>() {
    const items: T[] = [];

    return {
        add(item: T) {
            items.push(item);
        },
        remove(item: T) {
            const index = items.indexOf(item);
            if (index >= 0) items.splice(index, 1);
        },
        clear() {
            items.length = 0;
        },
        unique() {
            return [...new Set(items)];
        },
        get isEmpty() {
            return items.length === 0;
        },
    };
}
