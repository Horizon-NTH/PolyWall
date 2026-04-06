import { expect, test } from '@playwright/test';

import { ADMIN_CREDENTIALS } from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';
import { safeGoto } from './helpers/navigation';

async function ensureSchedulesList(page: Parameters<typeof login>[0]) {
    await safeGoto(page, '/dashboard/schedules');
    await expect
        .poll(() => {
            const url = new URL(page.url());
            return url.pathname === '/dashboard/schedules' && url.searchParams.has('channelId');
        }, {timeout: 15000})
        .toBe(true);
}

async function findScheduleLink(page: Parameters<typeof login>[0]) {
    const scheduleLinks = page.locator(
        'main table a[href^="/dashboard/schedules/"]:not([href*="/edit"]):not([href*="/new"])',
    );
    const count = await scheduleLinks.count();
    if (count === 0) return null;

    const first = scheduleLinks.first();
    const href = await first.getAttribute('href');
    if (!href) return null;

    return {
        locator: first,
        href,
        name: (await first.textContent())?.trim() ?? '',
    };
}

async function ensureChannelWithSchedules(page: Parameters<typeof login>[0]) {
    await ensureSchedulesList(page);
    await page.waitForLoadState('networkidle');

    const selector = page.getByRole('combobox').first();
    await selector.click();

    const optionLocators = page.getByRole('option');
    const optionCount = await optionLocators.count();
    const optionNames: string[] = [];

    for (let index = 0; index < optionCount; index += 1) {
        optionNames.push((await optionLocators.nth(index).textContent())?.trim() ?? '');
    }

    await page.keyboard.press('Escape');

    for (const optionName of optionNames) {
        await selector.click();
        await page.getByRole('option', {name: optionName}).click();
        await page.waitForLoadState('networkidle');

        const scheduleLink = await findScheduleLink(page);
        if (scheduleLink) {
            const currentUrl = new URL(page.url());
            return {
                initialSchedulesUrl: `${currentUrl.pathname}${currentUrl.search}`,
                scheduleLink,
            };
        }
    }

    return null;
}

test.describe('schedules', () => {
    test.beforeEach(async ({context}) => {
        await context.clearCookies();
    });

    test('keeps returnTo through schedule -> playlist -> save -> detail -> back -> back', async ({page}) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const scheduleContext = await ensureChannelWithSchedules(page);
        const {initialSchedulesUrl, scheduleLink} = scheduleContext!;
        await scheduleLink.locator.click();
        await expect(page).toHaveURL(/\/dashboard\/schedules\/[^/]+(\?.*)?$/);

        const scheduleDetailUrl = new URL(page.url());
        expect(scheduleDetailUrl.pathname).toMatch(/^\/dashboard\/schedules\/[^/]+$/);
        expect(scheduleDetailUrl.searchParams.get('returnTo')).toBe(initialSchedulesUrl);

        const playlistLink = page.locator('main a[href^="/dashboard/playlists/"]').first();
        const playlistHref = await playlistLink.getAttribute('href');
        if (!playlistHref) throw new Error('Lien playlist introuvable sur la fiche programmation.');

        await playlistLink.click();
        await expect(page).toHaveURL(new RegExp(`${new URL(playlistHref, 'http://localhost').pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\?.*)?$`));
        const playlistDetailUrl = new URL(page.url());
        expect(playlistDetailUrl.pathname).toBe(new URL(playlistHref, 'http://localhost').pathname);
        expect(playlistDetailUrl.searchParams.get('returnTo')).toBe(`${scheduleDetailUrl.pathname}${scheduleDetailUrl.search}`);

        await page.getByRole('link', {name: 'Modifier infos'}).click();
        await expect(page).toHaveURL(/\/dashboard\/playlists\/[^/]+\/edit(\?.*)?$/);
        const playlistEditUrl = new URL(page.url());
        expect(playlistEditUrl.pathname).toMatch(/^\/dashboard\/playlists\/[^/]+\/edit$/);
        expect(playlistEditUrl.searchParams.get('returnTo')).toBe(`${scheduleDetailUrl.pathname}${scheduleDetailUrl.search}`);

        await page.getByRole('button', {name: 'Enregistrer'}).click();
        await expect(page).toHaveURL(
            `${playlistDetailUrl.pathname}?returnTo=${encodeURIComponent(`${scheduleDetailUrl.pathname}${scheduleDetailUrl.search}`)}`,
        );

        await page.getByRole('link', {name: 'Retour'}).click();
        await expect(page).toHaveURL(`${scheduleDetailUrl.pathname}${scheduleDetailUrl.search}`);

        await page.getByRole('link', {name: 'Retour'}).click();
        await expect(page).toHaveURL(initialSchedulesUrl);
    });

    test('keeps returnTo through schedule -> channel -> cancel -> detail -> back -> back', async ({page}) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const scheduleContext = await ensureChannelWithSchedules(page);
        const {initialSchedulesUrl, scheduleLink} = scheduleContext!;
        await scheduleLink.locator.click();
        await expect(page).toHaveURL(/\/dashboard\/schedules\/[^/]+(\?.*)?$/);

        const scheduleDetailUrl = new URL(page.url());
        expect(scheduleDetailUrl.pathname).toMatch(/^\/dashboard\/schedules\/[^/]+$/);
        expect(scheduleDetailUrl.searchParams.get('returnTo')).toBe(initialSchedulesUrl);

        const channelLink = page.locator('main a[href^="/dashboard/channels/"]').first();
        const channelHref = await channelLink.getAttribute('href');
        if (!channelHref) throw new Error('Lien canal introuvable sur la fiche programmation.');

        await channelLink.click();
        await expect(page).toHaveURL(new RegExp(`${new URL(channelHref, 'http://localhost').pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\?.*)?$`));
        const channelDetailUrl = new URL(page.url());
        expect(channelDetailUrl.pathname).toBe(new URL(channelHref, 'http://localhost').pathname);
        expect(channelDetailUrl.searchParams.get('returnTo')).toBe(`${scheduleDetailUrl.pathname}${scheduleDetailUrl.search}`);

        await page.getByRole('link', {name: 'Modifier infos'}).click();
        await expect(page).toHaveURL(/\/dashboard\/channels\/[^/]+\/edit(\?.*)?$/);
        const channelEditUrl = new URL(page.url());
        expect(channelEditUrl.pathname).toMatch(/^\/dashboard\/channels\/[^/]+\/edit$/);
        expect(channelEditUrl.searchParams.get('returnTo')).toBe(`${scheduleDetailUrl.pathname}${scheduleDetailUrl.search}`);

        await page.getByRole('link', {name: 'Annuler'}).click();
        await expect(page).toHaveURL(`${channelDetailUrl.pathname}${channelDetailUrl.search}`);

        await page.getByRole('link', {name: 'Retour'}).click();
        await expect(page).toHaveURL(`${scheduleDetailUrl.pathname}${scheduleDetailUrl.search}`);

        await page.getByRole('link', {name: 'Retour'}).click();
        await expect(page).toHaveURL(initialSchedulesUrl);
    });

    test('keeps returnTo when editing a schedule and saving without changes', async ({page}) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const scheduleContext = await ensureChannelWithSchedules(page);
        const {initialSchedulesUrl, scheduleLink} = scheduleContext!;
        await scheduleLink.locator.click();
        await expect(page).toHaveURL(/\/dashboard\/schedules\/[^/]+(\?.*)?$/);

        const scheduleDetailUrl = new URL(page.url());
        expect(scheduleDetailUrl.pathname).toMatch(/^\/dashboard\/schedules\/[^/]+$/);
        expect(scheduleDetailUrl.searchParams.get('returnTo')).toBe(initialSchedulesUrl);

        await page.getByRole('link', {name: 'Modifier'}).click();
        await expect(page).toHaveURL(/\/dashboard\/schedules\/[^/]+\/edit(\?.*)?$/);
        const scheduleEditUrl = new URL(page.url());
        expect(scheduleEditUrl.pathname).toMatch(/^\/dashboard\/schedules\/[^/]+\/edit$/);
        expect(scheduleEditUrl.searchParams.get('returnTo')).toBe(initialSchedulesUrl);

        await page.getByRole('button', {name: 'Enregistrer'}).click();
        await expect(page).toHaveURL(`${scheduleDetailUrl.pathname}${scheduleDetailUrl.search}`);

        await page.getByRole('link', {name: 'Retour'}).click();
        await expect(page).toHaveURL(initialSchedulesUrl);
    });
});
