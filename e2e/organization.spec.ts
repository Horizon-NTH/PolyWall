import { expect, test } from '@playwright/test';

import {
    ADMIN_CREDENTIALS,
    DEMO_ORG_NAME,
    SUPER_ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';

test.describe('organization page', () => {
    test.beforeEach(async ({context}) => {
        await context.clearCookies();
    });

    test('organization admin sees overview without actions', async ({page}) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
        await page.goto('/dashboard/organization');
        await expect(page).toHaveURL(/\/dashboard\/organization$/);

        await expect(page.getByRole('heading', {name: DEMO_ORG_NAME})).toBeVisible();
        await expect(page.getByText('Dernière mise à jour le')).toBeVisible();
        await expect(page.getByRole('link', {name: 'Retour'})).toHaveCount(0);
        await expect(page.getByRole('link', {name: 'Modifier'})).toHaveCount(0);
    });

    test('super admin sees empty state or overview and can select an organization', async ({page}) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);
        await page.goto('/dashboard/organization');
        await expect(page).toHaveURL(/\/dashboard\/organization$/);

        await expect(
            page.getByText('Sélectionnez une organisation pour accéder à cette page.'),
        ).toBeVisible();

        await page.getByTestId('organization-select-trigger').click();
        await page.getByRole('option', {name: DEMO_ORG_NAME}).click();

        await expect(page.getByText('Dernière mise à jour le')).toBeVisible();
    });
});
