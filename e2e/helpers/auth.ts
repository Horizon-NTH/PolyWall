import { type Page } from '@playwright/test';

export async function login(page: Page, email: string, password: string) {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('textbox', {name: 'Mot de passe'}).fill(password);
    await page.getByRole('button', {name: 'Se connecter'}).click();
    await page.waitForURL('**/dashboard**', {waitUntil: 'commit'});
}
