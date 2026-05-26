import { expect, test } from '@playwright/test';

import {
    ADMIN_CREDENTIALS,
    SUPER_ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';
import { safeGoto } from './helpers/navigation';

test.describe('dashboard overview', () => {
    test.beforeEach(async ({context}) => {
        await context.clearCookies();
    });

    test('organization admin sees operational dashboard sections', async ({page}) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
        await safeGoto(page, '/dashboard');

        await expect(page).toHaveURL(/\/dashboard$/);
        await expect(page.getByText('Tableau de bord', {exact: true})).toBeVisible();
        await expect(page.getByText('Écrans actifs')).toBeVisible();
        await expect(page.getByText('Canaux', {exact: true}).first()).toBeVisible();
        await expect(page.getByText('Médias prêts')).toBeVisible();
        await expect(page.getByText('Playlists', {exact: true}).first()).toBeVisible();
        await expect(page.getByText('État des canaux')).toBeVisible();
        await expect(page.getByText('Actions rapides')).toBeVisible();
        await expect(page.getByText('À traiter', {exact: true}).first()).toBeVisible();
        await expect(page.getByText('Activité média')).toBeVisible();
        await expect(page.getByRole('link', {name: 'Ajouter un média'})).toBeVisible();
        await expect(page.getByRole('link', {name: 'Créer une playlist'})).toBeVisible();
    });

    test('platform super admin sees platform dashboard without selected organization', async ({page}) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);
        await safeGoto(page, '/dashboard');

        await expect(page).toHaveURL(/\/dashboard$/);
        await expect(page.getByText('Tableau de bord', {exact: true})).toBeVisible();
        await expect(page.getByText('Entités').first()).toBeVisible();
        await expect(page.getByText('Utilisateurs')).toBeVisible();
        await expect(page.getByText('Entités récentes')).toBeVisible();
        await expect(page.getByText('Plateforme')).toBeVisible();
    });
});
