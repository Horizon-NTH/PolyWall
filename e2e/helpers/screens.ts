import { expect, type Page } from '@playwright/test';

import { safeGoto } from './navigation';
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
    await expect(pendingScreenLink).toBeVisible({timeout: 10_000});
    await page.locator('tr', {has: pendingScreenLink}).getByRole('link', {name: 'Valider l\'écran'}).click();
}

export async function deleteScreenById(page: Page, screenId: string) {
    if (page.isClosed()) return;

    await safeGoto(page, `/dashboard/screens/${screenId}`);
    const deleteButton = page.getByRole('button', {name: 'Supprimer'}).first();
    if ((await deleteButton.count()) === 0) return;

    await deleteButton.click();
    await confirmAlertDialog(page);
    await expect(page.getByText('Écran supprimé.')).toBeVisible();
}
