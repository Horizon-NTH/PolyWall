export const RETURN_TO_PARAM = 'returnTo';

export function sanitizeReturnTo(returnTo: string | null | undefined) {
    if (!returnTo) return null;
    return returnTo.startsWith('/dashboard') ? returnTo : null;
}

export function resolveReturnTo(returnTo: string | null | undefined, fallbackHref: string) {
    return sanitizeReturnTo(returnTo) ?? fallbackHref;
}

export function appendReturnTo(href: string, returnTo: string | null | undefined) {
    const safeReturnTo = sanitizeReturnTo(returnTo);
    if (!safeReturnTo) return href;

    const url = new URL(href, 'http://localhost');
    url.searchParams.set(RETURN_TO_PARAM, safeReturnTo);
    return `${url.pathname}${url.search}${url.hash}`;
}

export function appendQueryParamToHref(href: string, key: string, value: string) {
    const url = new URL(href, 'http://localhost');
    url.searchParams.set(key, value);
    return `${url.pathname}${url.search}${url.hash}`;
}

export function removeQueryParamFromHref(href: string, key: string) {
    const url = new URL(href, 'http://localhost');
    url.searchParams.delete(key);
    return `${url.pathname}${url.search}${url.hash}`;
}
