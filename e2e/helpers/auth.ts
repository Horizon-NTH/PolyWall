import { type Page } from '@playwright/test';

export async function login(page: Page, email: string, password: string) {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('textbox', {name: 'Mot de passe'}).fill(password);
    await page.getByRole('button', {name: 'Se connecter'}).click();
    const result = await Promise.race([
        page.waitForURL('**/dashboard*', {waitUntil: 'commit'}).then(() => 'ok' as const),
        page
            .getByText('Email ou mot de passe incorrect')
            .waitFor({state: 'visible'})
            .then(() => 'error' as const),
    ]);
    if (result === 'error') {
        throw new Error('Login failed: invalid credentials.');
    }
}
