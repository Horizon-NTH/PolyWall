import { expect, test } from '@playwright/test';

import { ADMIN_CREDENTIALS, CONTENT_MANAGER_CREDENTIALS } from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';

test.describe('channels page', () => {
    test.beforeEach(async ({context}) => {
        await context.clearCookies();
    });

    test('organization admin can access channels page and sees create action', async ({page}) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        await page.getByRole('link', {name: 'Canaux'}).click();

        await expect(page).toHaveURL(/\/dashboard\/channels$/);
        await expect(page.getByRole('link', {name: 'Créer'})).toBeVisible();
    });

    test('content manager can read channels but cannot create', async ({page}) => {
        await login(page, CONTENT_MANAGER_CREDENTIALS.email, CONTENT_MANAGER_CREDENTIALS.password);

        await page.getByRole('link', {name: 'Canaux'}).click();

        await expect(page).toHaveURL(/\/dashboard\/channels$/);
        await expect(page.getByRole('link', {name: 'Créer'})).toHaveCount(0);
    });
});
