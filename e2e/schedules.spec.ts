import { expect, test, type Page } from '@playwright/test';

import {
    ADMIN_CREDENTIALS,
    CONTENT_MANAGER_CREDENTIALS,
    SUPER_ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';
import { safeGoto } from './helpers/navigation';

async function ensureSchedulesList(page: Page) {
    await safeGoto(page, '/dashboard/schedules');
    await expect
        .poll(() => {
            const url = new URL(page.url());
            return url.pathname === '/dashboard/schedules' && url.searchParams.has('channelId');
        }, {timeout: 15000})
        .toBe(true);
}

async function findScheduleLink(page: Page, scheduleName?: string) {
    const scheduleLinks = scheduleName
        ? page.getByRole('link', {name: scheduleName})
        : page.locator(
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

async function ensureChannelWithSchedules(page: Page) {
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
            const initialUrlWithTab = new URL(`${currentUrl.pathname}${currentUrl.search}`, 'http://localhost');
            initialUrlWithTab.searchParams.set('tab', 'schedules');
            return {
                channelId: currentUrl.searchParams.get('channelId') ?? '',
                initialSchedulesUrl: `${initialUrlWithTab.pathname}${initialUrlWithTab.search}`,
                scheduleLink,
            };
        }
    }

    return null;
}

async function selectFirstOption(page: Page, label: string) {
    const trigger = page.getByLabel(label);
    await trigger.click();
    const firstOption = page.getByRole('option').first();
    const optionText = (await firstOption.textContent())?.trim() ?? '';
    await firstOption.click();
    return optionText;
}

function getFieldButton(page: Page, label: string) {
    return page
        .locator('[data-slot="field"]')
        .filter({hasText: label})
        .first()
        .getByRole('button')
        .first();
}

async function selectDateByEnabledIndex(page: Page, label: string, enabledIndex: number) {
    await getFieldButton(page, label).click();
    const enabledDayButtons = page.locator('[data-slot="calendar"] button[data-day]:not([disabled])');
    await expect(enabledDayButtons.nth(enabledIndex)).toBeVisible();
    await enabledDayButtons.nth(enabledIndex).click();
}

async function setTimeFromPreset(page: Page, label: string, presetLabel: RegExp | string) {
    await getFieldButton(page, label).click();
    await page.getByRole('button', {name: presetLabel}).click();
}

async function fillEventScheduleForm(params: {
    page: Page;
    dateIndex: number;
}) {
    const {page, dateIndex} = params;

    const typeTrigger = page.getByLabel('Type');
    if (await typeTrigger.count()) {
        const currentTypeLabel = ((await typeTrigger.textContent()) ?? '').trim();
        if (!currentTypeLabel.includes('Événementielle')) {
            await typeTrigger.click();
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
        }
    }

    await selectFirstOption(page, 'Playlist');

    await selectDateByEnabledIndex(page, 'Date de début', dateIndex);
    await setTimeFromPreset(page, 'Heure de début', /Début de journée/);
}

async function createEventScheduleWithRetry(params: {
    page: Page;
    baseNewScheduleUrl: string;
}) {
    const {page, baseNewScheduleUrl} = params;

    for (let dateIndex = 0; dateIndex < 10; dateIndex += 1) {
        await safeGoto(page, baseNewScheduleUrl);
        await expect(page).toHaveURL(new RegExp('^.+/dashboard/schedules/new'));

        await fillEventScheduleForm({page, dateIndex});
        await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();

        try {
            await page.waitForURL(/\/dashboard\/schedules\/[^/]+(\?.*)?$/, {timeout: 3500});
            return {dateIndex};
        } catch {
            await expect(page.getByText('Conflit détecté')).toBeVisible();
        }
    }

    throw new Error('Impossible de créer une programmation événementielle sans conflit après 10 tentatives.');
}

test.describe('schedules', () => {
    test.describe.configure({mode: 'serial'});

    test.beforeEach(async ({context}) => {
        await context.clearCookies();
    });

    test('super admin must select an organization before accessing schedules pages', async ({page}) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);
        await safeGoto(page, '/dashboard/schedules');

        await expect(page).toHaveURL(/\/dashboard\/schedules$/);
        await expect(
            page.getByText('Sélectionnez une organisation pour accéder à cette page.'),
        ).toBeVisible();
        await expect(page.getByRole('combobox')).toBeVisible();
    });

    test('content manager can access schedules list and creation page', async ({page}) => {
        await login(page, CONTENT_MANAGER_CREDENTIALS.email, CONTENT_MANAGER_CREDENTIALS.password);
        await ensureSchedulesList(page);

        await expect(page.getByRole('link', {name: 'Nouvelle programmation'})).toBeVisible();
        await expect(page.getByRole('tab', {name: 'Programmations'})).toBeVisible();
        await expect(page.getByRole('tab', {name: 'Planning'})).toBeVisible();
        await expect(page.getByRole('tab', {name: 'Canal'})).toBeVisible();

        const currentUrl = new URL(page.url());
        const channelId = currentUrl.searchParams.get('channelId');
        expect(channelId).toBeTruthy();

        await safeGoto(page, `/dashboard/schedules/new?channelId=${channelId}`);
        await expect(page).toHaveURL(new RegExp(`/dashboard/schedules/new\\?channelId=${channelId}`));
        await expect(page.getByLabel('Type')).toBeVisible();
        await expect(page.getByLabel('Playlist')).toBeVisible();
        await expect(page.getByRole('main').getByRole('button', {name: 'Créer'})).toBeVisible();
    });

    test('list page supports search, filters, tabs and row actions', async ({page}) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const scheduleContext = await ensureChannelWithSchedules(page);
        const {channelId} = scheduleContext!;
        const scheduleRow = page.locator('main table tbody tr').first();
        const firstCellText = ((await scheduleRow.getByRole('cell').nth(0).textContent()) ?? '').trim();
        const scheduleName = firstCellText
            .replace(/^Événementielle/, '')
            .replace(/^Récurrente/, '')
            .trim();

        const search = page.getByPlaceholder('Rechercher une programmation...');
        await expect(search).toBeVisible();
        await search.fill(scheduleName);
        await expect(search).toHaveValue(scheduleName);
        await expect(scheduleRow).toBeVisible();

        const typeBadgeText = firstCellText.includes('Événementielle') ? 'Événementielle' : 'Récurrente';
        const progressBadgeText = ((await scheduleRow.getByRole('cell').nth(4).textContent()) ?? '').trim();
        const statusBadgeText = ((await scheduleRow.getByRole('cell').nth(5).textContent()) ?? '').trim();

        const typeFilter = page.getByRole('button', {name: 'Type'}).first();
        await typeFilter.click();
        await page.getByRole('menuitemradio', {name: typeBadgeText}).click();
        await expect(scheduleRow).toBeVisible();

        const statusFilter = page.getByRole('combobox').nth(1);
        await statusFilter.click();
        await page.getByRole('option', {
            name: statusBadgeText === 'Active' ? /^Actives$/ : /^Inactives$/,
        }).click();
        await expect(scheduleRow).toBeVisible();

        const progressOptionName = progressBadgeText === 'Terminée'
            ? /^Terminées$/
            : progressBadgeText === 'À venir'
                ? /^À venir$/
                : /^En cours$/;

        const progressFilter = page.getByRole('combobox').nth(2);
        await progressFilter.click();
        await page.getByRole('option', {name: progressOptionName}).click();
        await expect(scheduleRow).toBeVisible();

        await page.getByRole('button', {name: 'Réinitialiser'}).click();
        await expect(search).toHaveValue('');

        await scheduleRow.getByRole('button', {name: 'Ouvrir le menu'}).click();
        await expect(page.getByRole('menuitem', {name: 'Voir la fiche'})).toBeVisible();
        await expect(page.getByRole('menuitem', {name: 'Modifier'})).toBeVisible();
        await expect(page.getByRole('menuitem', {name: 'Supprimer'})).toBeVisible();
        await page.getByRole('menuitem', {name: 'Voir la fiche'}).click();

        await expect(page).toHaveURL(/\/dashboard\/schedules\/[^/]+(\?.*)?$/);
        await expect(page.getByRole('heading', {name: scheduleName})).toBeVisible();
        await expect(page.getByText('Informations')).toBeVisible();

        await page.getByRole('link', {name: 'Retour'}).click();
        await expect(page).toHaveURL(new RegExp(`/dashboard/schedules\\?channelId=${channelId}&tab=schedules$`));

        await page.getByRole('tab', {name: 'Planning'}).click();
        await expect(page.getByRole('tab', {name: 'Planning'})).toHaveAttribute('aria-selected', 'true');

        await page.getByRole('tab', {name: 'Canal'}).click();
        await expect(page.getByText('Playlist par défaut', {exact: true})).toBeVisible();
        await expect(page.getByText('Aperçu de diffusion', {exact: true})).toBeVisible();
    });

    test('schedule detail page exposes summary and edit entrypoint', async ({page}) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const scheduleContext = await ensureChannelWithSchedules(page);
        const {scheduleLink} = scheduleContext!;
        await scheduleLink.locator.click();

        await expect(page).toHaveURL(/\/dashboard\/schedules\/[^/]+(\?.*)?$/);
        await expect(page.getByRole('main').getByRole('heading').first()).toBeVisible();
        await expect(page.getByText('Informations')).toBeVisible();
        await expect(page.getByText('Playlist', {exact: true})).toBeVisible();
        await expect(page.getByText('Canal', {exact: true})).toBeVisible();
        await expect(page.getByRole('link', {name: 'Modifier'})).toBeVisible();

        await page.getByRole('link', {name: 'Modifier'}).click();
        await expect(page).toHaveURL(/\/dashboard\/schedules\/[^/]+\/edit(\?.*)?$/);
        await expect(page.getByLabel('Type')).toBeVisible();
        await expect(page.getByLabel('Playlist')).toBeVisible();
        await expect(page.getByRole('button', {name: 'Enregistrer'})).toBeVisible();

        await page.getByRole('link', {name: 'Annuler'}).click();
        await expect(page).toHaveURL(/\/dashboard\/schedules\/[^/]+(\?.*)?$/);
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

    test('calendar event click keeps tab query and app back returns to planning tab', async ({page}) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
        await ensureSchedulesList(page);

        const schedulesUrl = new URL(page.url());
        const channelId = schedulesUrl.searchParams.get('channelId');
        expect(channelId).toBeTruthy();
        const baseNewScheduleUrl = `/dashboard/schedules/new?channelId=${channelId}&type=EVENT`;

        const created = await createEventScheduleWithRetry({
            page,
            baseNewScheduleUrl,
        });
        expect(created.dateIndex).toBeGreaterThanOrEqual(0);

        await safeGoto(page, `/dashboard/schedules?channelId=${channelId}`);
        await page.getByRole('tab', {name: 'Planning'}).click();
        await expect(page.getByRole('tab', {name: 'Planning'})).toHaveAttribute('aria-selected', 'true');

        const calendarEvent = page.locator('.sx__event').first();
        await expect(calendarEvent).toBeVisible();
        await calendarEvent.click();

        await expect(page).toHaveURL(/\/dashboard\/schedules\/[^/]+(\?.*)?$/);
        const detailUrl = new URL(page.url());
        const returnTo = detailUrl.searchParams.get('returnTo');
        expect(returnTo).toBe(`/dashboard/schedules?channelId=${channelId}&tab=calendar`);

        await page.getByRole('link', {name: 'Retour'}).click();
        await expect(page).toHaveURL(new RegExp(`/dashboard/schedules\\?channelId=${channelId}&tab=calendar`));
        await expect(page.getByRole('tab', {name: 'Planning'})).toHaveAttribute('aria-selected', 'true');
    });

    test('conflict link then app back restores schedule form state', async ({page}) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
        await ensureSchedulesList(page);

        const schedulesUrl = new URL(page.url());
        const channelId = schedulesUrl.searchParams.get('channelId');
        expect(channelId).toBeTruthy();
        const baseNewScheduleUrl = `/dashboard/schedules/new?channelId=${channelId}&type=EVENT`;

        const baseSchedule = await createEventScheduleWithRetry({
            page,
            baseNewScheduleUrl,
        });

        await safeGoto(page, baseNewScheduleUrl);
        await fillEventScheduleForm({page, dateIndex: baseSchedule.dateIndex});
        const selectedStartDateLabel = ((await getFieldButton(page, 'Date de début').textContent()) ?? '').trim();
        await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();

        await expect(page.getByText('Conflit détecté', {exact: true})).toBeVisible();
        await expect(page.getByText('1 conflit détecté.')).toBeVisible();

        await page.getByRole('link', {name: 'Voir la programmation en conflit'}).first().click();
        await expect(page).toHaveURL(/\/dashboard\/schedules\/[^/]+(\?.*)?$/);
        const backLink = page.getByRole('link', {name: 'Retour'});
        await expect(backLink).toHaveAttribute('href', /\/dashboard\/schedules\/new\?/);
        await expect(backLink).toHaveAttribute('href', /restoreConflictDraft=1/);

        await backLink.click();
        await expect(page).toHaveURL(new RegExp(`/dashboard/schedules/new\\?channelId=${channelId}&type=EVENT`));
        await expect(page.getByText('Conflit détecté', {exact: true})).toBeVisible();
        await expect(page.getByText('1 conflit détecté.')).toBeVisible();
        await expect(page.getByLabel('Type')).toContainText('Événementielle');
        await expect(getFieldButton(page, 'Date de début')).toContainText(selectedStartDateLabel);
        await expect(getFieldButton(page, 'Heure de début')).toContainText('00:00');
        await expect(page.getByLabel('Fin de diffusion')).toContainText('Durée de la playlist');
    });
});
