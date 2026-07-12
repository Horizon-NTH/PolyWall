import { expect, type Page } from '@playwright/test';

import { extractDashboardEntityId } from './data';
import { confirmAlertDialog } from './ui';

export async function clearDisplayStorage(page: Page) {
    await page.addInitScript(() => {
        if (window.sessionStorage.getItem('polywall.e2e.display-storage-cleared') === 'true') return;

        window.localStorage.removeItem('polywall.screen.deviceId');
        window.localStorage.removeItem('polywall.display.asset-meta');
        Object.keys(window.localStorage)
            .filter((key) => key.startsWith('polywall.display.snapshot.'))
            .forEach((key) => window.localStorage.removeItem(key));
        window.sessionStorage.clear();
        window.sessionStorage.setItem('polywall.e2e.display-storage-cleared', 'true');
    });
}

export async function generateScreenPairingOtpCode(page: Page) {
    await page.goto('/dashboard/screens');

    const otpInput = page.getByPlaceholder('Aucun code généré');
    const generateOtpButton = page.getByRole('button', {name: 'Générer code OTP'});
    await generateOtpButton.click();
    await expect(otpInput).toHaveValue(/^\d{6}$/);
    return (await otpInput.inputValue()).replace(/\s+/g, '');
}

export async function pairDisplayPage(displayPage: Page, otpCode: string) {
    await displayPage.goto('/display', {waitUntil: 'domcontentloaded'});
    await expect(displayPage.locator('[data-slot="input-otp"]')).toBeVisible();
    await displayPage.locator('[data-slot="input-otp"]').fill(otpCode);
    await displayPage.getByRole('button', {name: 'Valider le code'}).click();
    await expect(displayPage.getByText('Écran en attente', {exact: true})).toBeVisible();
    await expect(
        displayPage.getByText(/L'écran a été appairé mais doit encore être validé par un administrateur\./),
    ).toBeVisible();

    const deviceIdText = await displayPage.getByText(/^ID appareil:/).textContent();
    const deviceId = deviceIdText?.split(':').at(1)?.trim() ?? '';
    return {
        deviceId,
        pendingScreenName: `Écran en attente ${deviceId.slice(0, 8).toUpperCase()}`,
    };
}

export async function openPendingScreenApproval(page: Page, pendingScreenName: string) {
    const pendingTab = page.getByRole('tab', {name: /En attente/});
    await pendingTab.click();
    await expect(pendingTab).toHaveAttribute('aria-selected', 'true');

    const pendingScreenLink = page.getByRole('link', {name: pendingScreenName});
    await page.locator('tr', {has: pendingScreenLink}).getByRole('link', {name: 'Valider l\'écran'}).click();
    await page.waitForURL((url) => /^\/dashboard\/screens\/[^/]+\/edit$/.test(url.pathname));
    const editUrl = new URL(page.url());
    editUrl.pathname = editUrl.pathname.replace(/\/edit$/, '');
    editUrl.search = '';
    return extractDashboardEntityId(editUrl.toString(), 'screens');
}

export async function deleteScreenById(page: Page, screenId: string) {
    await page.goto(`/dashboard/screens/${screenId}`);
    await page.getByRole('button', {name: 'Supprimer'}).click();
    await confirmAlertDialog(page);
    await expect(page.getByText('Écran supprimé.')).toBeVisible();
}
