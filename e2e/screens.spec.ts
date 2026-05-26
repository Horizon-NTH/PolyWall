import { expect, test } from '@playwright/test';

import {
    ADMIN_CREDENTIALS,
    CONTENT_MANAGER_CREDENTIALS,
    SUPER_ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';
import { extractDashboardEntityId } from './helpers/data';
import { safeGoto } from './helpers/navigation';
import {
    clearDisplayStorage,
    deleteScreenById,
    generateScreenPairingOtpCode,
    openPendingScreenApproval,
    pairDisplayPage,
} from './helpers/screens';

test.describe('screens', () => {
    test('super admin must select an organization before accessing screens page', async ({page}) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);
        await safeGoto(page, '/dashboard/screens');

        await expect(page).toHaveURL(/\/dashboard\/screens$/);
        await expect(
            page.getByText('Sélectionnez une organisation pour accéder à cette page.'),
        ).toBeVisible();
        await expect(page.getByRole('combobox')).toBeVisible();
    });

    test('content manager can read screens but cannot modify', async ({page}) => {
        await login(page, CONTENT_MANAGER_CREDENTIALS.email, CONTENT_MANAGER_CREDENTIALS.password);
        await safeGoto(page, '/dashboard/screens');

        await expect(page).toHaveURL(/\/dashboard\/screens$/);
        await expect(page.getByText('Appairage d\'un écran')).toHaveCount(0);
        const firstScreenLink = page.locator('main table a[href^="/dashboard/screens/"]').first();
        await expect(firstScreenLink).toBeVisible();
        await firstScreenLink.click();

        await expect(page).toHaveURL(/\/dashboard\/screens\/[^/]+(\?.*)?$/);
        await expect(page.getByRole('link', {name: 'Retour'})).toBeVisible();
        await expect(page.getByRole('link', {name: /Valider|Modifier/})).toHaveCount(0);
        await expect(page.getByRole('button', {name: /Supprimer|Révoquer|Réactiver/})).toHaveCount(0);
    });

    test('admin can pair and approve a screen', async ({page, context}) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
        const otpCode = await generateScreenPairingOtpCode(page);

        const displayPage = await context.newPage();
        await clearDisplayStorage(displayPage);
        const {pendingScreenName} = await pairDisplayPage(displayPage, otpCode);
        await openPendingScreenApproval(page, pendingScreenName);

        await page.getByLabel('Nom').fill(`E2E écran ${Date.now()}`);
        await page.getByLabel('Localisation').fill('E2E - Hall');

        const channelSelect = page.getByLabel('Canal');
        await channelSelect.click();
        await page.getByRole('option').first().click();

        await page.getByRole('button', {name: 'Valider'}).click();

        await expect(page.getByText('Écran validé.')).toBeVisible();
        await expect(page).toHaveURL(/\/dashboard\/screens\/[^/]+$/);

        const screenId = extractDashboardEntityId(page.url(), 'screens');
        await displayPage.close();
        await deleteScreenById(page, screenId);
        await safeGoto(page, '/dashboard/screens');
        await expect(page).toHaveURL(/\/dashboard\/screens$/);
    });

    test('admin can enable tactile interruption on a paired screen', async ({page, context}) => {
        await context.clearCookies();
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const displayPage = await context.newPage();
        await clearDisplayStorage(displayPage);

        let screenId: string | null = null;

        try {
            const otpCode = await generateScreenPairingOtpCode(page);
            const {pendingScreenName} = await pairDisplayPage(displayPage, otpCode);
            await openPendingScreenApproval(page, pendingScreenName);

            const screenName = `E2E interruption tactile ${Date.now()}`;
            const interactiveUrl = new URL('/login', page.url()).toString();

            await page.getByLabel('Nom').fill(screenName);
            await page.getByLabel('Localisation').fill('E2E - borne tactile');

            const channelSelect = page.getByLabel('Canal');
            await channelSelect.click();
            await page.getByRole('option').first().click();

            await page.getByRole('checkbox', {name: 'Écran interactif'}).check();
            await expect(page.getByLabel('URL interactive')).toBeEnabled();
            await page.getByLabel('URL interactive').fill(interactiveUrl);

            await page.getByRole('button', {name: 'Valider'}).click();

            await expect(page.getByText('Écran validé.')).toBeVisible();
            await expect(page).toHaveURL(/\/dashboard\/screens\/[^/]+$/);
            screenId = extractDashboardEntityId(page.url(), 'screens');

            await displayPage.reload({waitUntil: 'domcontentloaded'});
            await expect(displayPage.locator('main.fixed.inset-0')).toBeVisible({timeout: 20_000});
            await displayPage.mouse.click(160, 160);

            await expect(displayPage.getByRole('dialog', {name: 'Site interactif'})).toBeVisible();
            await expect(displayPage.locator('iframe[title="Site interactif"]')).toHaveAttribute('src', interactiveUrl);

            await displayPage.getByRole('button', {name: 'Fermer le site interactif'}).click();
            await expect(displayPage.getByRole('dialog', {name: 'Site interactif'})).toHaveCount(0);
        } finally {
            await displayPage.close();
            if (screenId) {
                await deleteScreenById(page, screenId);
            }
        }
    });
});
