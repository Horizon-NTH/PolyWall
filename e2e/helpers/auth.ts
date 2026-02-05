import { expect, type Page } from '@playwright/test';

export async function login(page: Page, email: string, password: string) {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const passwordInput = page.getByRole('textbox', {name: 'Mot de passe'});
    const visibilityToggle = page.getByRole('button', {
        name: /Afficher le mot de passe|Masquer le mot de passe/,
    });
    await visibilityToggle.waitFor();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await visibilityToggle.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await visibilityToggle.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('textbox', {name: 'Mot de passe'}).fill(password);
    await page.getByRole('button', {name: 'Se connecter'}).click();
    await page.waitForURL('**/dashboard**', {waitUntil: 'commit'});
}
