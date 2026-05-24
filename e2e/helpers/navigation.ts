import { type Page } from '@playwright/test';

export async function safeGoto(page: Page, pathname: string) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            await page.goto(pathname, {waitUntil: 'domcontentloaded'});
            return;
        } catch (error) {
            const message = String(error);
            if (
                message.includes('NS_BINDING_ABORTED') ||
                message.includes('interrupted by another navigation')
            ) {
                await page.waitForLoadState('domcontentloaded');
                continue;
            }
            throw error;
        }
    }
}

export async function ensureDashboardPath(page: Page, pathname: string | RegExp) {
    const matcher = typeof pathname === 'string'
        ? new RegExp(`${pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
        : pathname;

    if (matcher.test(new URL(page.url(), 'http://localhost').pathname)) {
        await page.waitForLoadState('domcontentloaded');
        return;
    }

    const target = typeof pathname === 'string' ? pathname : page.url();
    await safeGoto(page, target);
    await page.waitForURL(matcher, {timeout: 15000});
    await page.waitForLoadState('domcontentloaded');
}
