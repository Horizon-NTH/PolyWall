import { expect, test, type Page } from '@playwright/test';
import {
    CONTENT_MANAGER_CREDENTIALS,
    SUPER_ADMIN_CREDENTIALS,
    ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';

async function login(page: Page, email: string, password: string) {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('textbox', {name: 'Mot de passe'}).fill(password);
    await page.getByRole('button', {name: 'Se connecter'}).click();
    const result = await Promise.race([
        page.waitForURL('**/dashboard', {waitUntil: 'commit'}).then(() => 'ok' as const),
        page
            .getByText('Email ou mot de passe incorrect')
            .waitFor({state: 'visible'})
            .then(() => 'error' as const),
    ]);
    if (result === 'error') {
        throw new Error('Login failed: invalid credentials.');
    }
}

test.describe('sidebar visibility', () => {
    test.beforeEach(async ({context}) => {
        await context.clearCookies();
    });

    test('platform super admin sees Administration and org switcher dropdown', async ({page}) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);

        await expect(page.getByText('Administration', {exact: true})).toBeVisible();
        await expect(page.getByText('Organisation', {exact: true})).toBeVisible();

        const switcherButton = page.getByRole('button', {name: /Logo PolyWall/i});
        await expect(switcherButton).toBeVisible();
        await switcherButton.click();
        await expect(page.getByText('Organisations')).toBeVisible();
    });

    test('organization admin sees Organisation section only', async ({page}) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        await expect(page.getByText('Organisation', {exact: true})).toBeVisible();
        await expect(page.getByText('Administration', {exact: true})).toHaveCount(0);
        await expect(page.getByRole('button', {name: /Logo PolyWall/i})).toHaveCount(0);
        await expect(page.getByRole('link', {name: /Logo PolyWall/i})).toBeVisible();
    });

    test('content manager sees no admin sections', async ({page}) => {
        await login(
            page,
            CONTENT_MANAGER_CREDENTIALS.email,
            CONTENT_MANAGER_CREDENTIALS.password,
        );

        await expect(page.getByText('Administration', {exact: true})).toHaveCount(0);
        await expect(page.getByText('Organisation', {exact: true})).toHaveCount(0);
        await expect(page.getByRole('button', {name: /Logo PolyWall/i})).toHaveCount(0);
        await expect(page.getByRole('link', {name: /Logo PolyWall/i})).toBeVisible();
    });
});

test.describe('organization switching', () => {
    test.beforeEach(async ({context}) => {
        await context.clearCookies();
    });

    test('switching organizations updates the switcher label', async ({page}) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);

        const switcherButton = page.getByRole('button', {name: /Logo PolyWall/i});

        await switcherButton.click();
        await page.getByRole('menuitem', {name: 'PolyWall Demo Org'}).click();
        await expect(switcherButton).toContainText('PolyWall Demo Org');

        await switcherButton.click();
        await page.getByRole('menuitem', {name: 'PolyWall Second Org'}).click();
        await expect(switcherButton).toContainText('PolyWall Second Org');
    });

    test('non-switchable roles cannot access the organization dropdown', async ({page}) => {
        await login(
            page,
            CONTENT_MANAGER_CREDENTIALS.email,
            CONTENT_MANAGER_CREDENTIALS.password,
        );

        await expect(page.getByRole('button', {name: /Logo PolyWall/i})).toHaveCount(0);
        await expect(page.getByRole('link', {name: /Logo PolyWall/i})).toBeVisible();
    });
});
