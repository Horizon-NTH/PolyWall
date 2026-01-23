import { expect, test } from '@playwright/test';
import { TEST_CREDENTIALS } from '@/test/fixtures/auth-test-credentials';

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

        await expect(page.getByText('Email ou mot de passe incorrect')).toBeVisible();
    });

    test('redirects when authenticated', async ({page}) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill(TEST_CREDENTIALS.email);
        await page.getByRole('textbox', {name: 'Mot de passe'}).fill(TEST_CREDENTIALS.password);
        await page.getByRole('button', {name: 'Se connecter'}).click();

        await page.waitForURL('**/dashboard', {waitUntil: 'commit'});

        await page.goto('/login');
        await page.waitForURL('**/dashboard', {waitUntil: 'commit'});
    });
});
