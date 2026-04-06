import { expect, test } from '@playwright/test';

import {
    ADMIN_CREDENTIALS,
    CONTENT_MANAGER_CREDENTIALS,
    SUPER_ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';
import { safeGoto } from './helpers/navigation';

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
        await safeGoto(page, '/dashboard/screens');

        const otpInput = page.getByPlaceholder('Aucun code généré');
        const generateOtpButton = page.getByRole('button', {name: 'Générer code OTP'});

        for (let attempt = 0; attempt < 3; attempt += 1) {
            await generateOtpButton.click();

            try {
                await expect(otpInput).toHaveValue(/^\d{6}$/, {timeout: 5_000});
                break;
            } catch (error) {
                if (attempt === 2) throw error;
            }
        }

        const otpCode = (await otpInput.inputValue()).replace(/\s+/g, '');

        const displayPage = await context.newPage();
        await displayPage.goto('/display', {waitUntil: 'domcontentloaded'});
        await displayPage.locator('[data-slot="input-otp"]').fill(otpCode);
        await displayPage.getByRole('button', {name: 'Valider le code'}).click();
        await expect(displayPage.getByText('Écran en attente de validation par un administrateur.')).toBeVisible();
        const deviceIdText = await displayPage.getByText(/^ID appareil:/).textContent();
        const deviceId = deviceIdText?.split(':').at(1)?.trim() ?? '';
        const pendingScreenName = `Écran en attente ${deviceId.slice(0, 8).toUpperCase()}`;

        await page.reload({waitUntil: 'domcontentloaded'});
        const pendingTab = page.getByRole('tab', {name: /En attente/});
        await expect(pendingTab).toBeVisible();
        for (let attempt = 0; attempt < 3; attempt += 1) {
            await pendingTab.click();
            try {
                await expect(pendingTab).toHaveAttribute('aria-selected', 'true', {timeout: 2_000});
                break;
            } catch (error) {
                if (attempt === 2) throw error;
            }
        }
        const pendingScreenLink = page.getByRole('link', {name: pendingScreenName});
        await expect(pendingScreenLink).toBeVisible();
        const pendingRow = page.locator('tr', {has: pendingScreenLink});
        await pendingRow.getByRole('link', {name: "Valider l'écran"}).click();

        await page.getByLabel('Nom').fill(`E2E écran ${Date.now()}`);
        await page.getByLabel('Localisation').fill('E2E - Hall');

        const channelSelect = page.getByLabel('Canal');
        await channelSelect.click();
        await page.getByRole('option').first().click();

        await page.getByRole('button', {name: 'Valider'}).click();

        await expect(page.getByText('Écran validé.')).toBeVisible();
        await expect(page).toHaveURL(/\/dashboard\/screens\/[^/]+$/);

        await page.getByRole('button', {name: 'Supprimer'}).click();
        const deleteDialog = page.getByRole('alertdialog');
        await deleteDialog.getByRole('button', {name: 'Supprimer'}).click();
        await expect(page.getByText('Écran supprimé.')).toBeVisible();
        await safeGoto(page, '/dashboard/screens');
        await expect(page).toHaveURL(/\/dashboard\/screens$/);
    });
});
