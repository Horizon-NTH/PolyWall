import { expect, test } from '@playwright/test';
import { ADMIN_CREDENTIALS } from '@/test/fixtures/auth-test-credentials';

test.describe('auth', () => {
    test.beforeEach(async ({context}) => {
        await context.clearCookies();
    });

    test('login page renders', async ({page}) => {
        await page.goto('/login');

        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByText('Bon retour')).toBeVisible();
        await expect(page.getByLabel('Email')).toBeVisible();
        await expect(page.getByRole('textbox', {name: 'Mot de passe'})).toBeVisible();
        await expect(page.getByRole('button', {name: 'Se connecter'})).toBeVisible();
    });

    test('shows error on invalid credentials', async ({page}) => {
        await page.goto('/login');

        await page.getByLabel('Email').fill('wrong@example.com');
        await page.getByRole('textbox', {name: 'Mot de passe'}).fill('wrong-password-123');
        await page.getByRole('button', {name: 'Se connecter'}).click();

        const formAlert = page.locator('form').getByRole('alert');
        await expect(formAlert).toBeVisible();
        await expect(formAlert).toContainText('Email ou mot de passe incorrect');
    });

    test('redirects when authenticated', async ({page}) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill(ADMIN_CREDENTIALS.email);
        await page.getByRole('textbox', {name: 'Mot de passe'}).fill(ADMIN_CREDENTIALS.password);
        await page.getByRole('button', {name: 'Se connecter'}).click();

        await expect(page.getByLabel('breadcrumb').getByRole('link', {name: 'Tableau de bord'})).toBeVisible();

        await page.goto('/login');
        await expect(page.getByLabel('breadcrumb').getByRole('link', {name: 'Tableau de bord'})).toBeVisible();
    });

    test('redirects unauthenticated users to login from dashboard', async ({page}) => {
        await page.goto('/dashboard');
        await page.waitForURL('**/login', {waitUntil: 'commit'});
        await expect(page.getByText('Bon retour')).toBeVisible();
    });

    test('redirects to callbackUrl after login', async ({page}) => {
        await page.goto('/login?callbackUrl=/');
        await page.getByLabel('Email').fill(ADMIN_CREDENTIALS.email);
        await page.getByRole('textbox', {name: 'Mot de passe'}).fill(ADMIN_CREDENTIALS.password);
        await page.getByRole('button', {name: 'Se connecter'}).click();

        await page.waitForURL('**/', {waitUntil: 'commit'});
        await expect(page).not.toHaveURL(/\/dashboard$/);
    });
});
