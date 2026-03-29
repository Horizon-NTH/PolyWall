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
