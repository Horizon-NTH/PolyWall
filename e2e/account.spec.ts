import { expect, test } from '@playwright/test';
import { ADMIN_CREDENTIALS } from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';
import { expectCardToBeVisible } from './helpers/ui';

test.describe('account page', () => {
    test.beforeEach(async ({context}) => {
        await context.clearCookies();
    });

    test('renders account sections and breadcrumb', async ({page}) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
        await page.goto('/dashboard/account');

        await expect(page.getByRole('heading', {name: 'Compte'})).toBeVisible();
        await expectCardToBeVisible(page, 'Profil');
        await expectCardToBeVisible(page, 'Mot de passe');
        await expectCardToBeVisible(page, 'Organisation');
        await expect(page.getByLabel('breadcrumb').getByRole('link', {name: 'Tableau de bord'})).toBeVisible();
    });

    test('shows validation errors', async ({page}) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
        await page.goto('/dashboard/account');

        await page.getByLabel('Nom complet').fill('A');
        await page.getByRole('button', {name: 'Enregistrer'}).click();
        await expect(
            page.getByText('Le nom complet doit contenir au moins 2 caractères'),
        ).toBeVisible();

        await page.getByLabel('Mot de passe actuel').fill('CurrentPass123!');
        await page.getByLabel('Nouveau mot de passe').fill('NewPassword123!');
        await page.getByLabel('Confirmer le mot de passe').fill('Mismatch123!');
        await page.getByRole('button', {name: 'Mettre à jour'}).click();
        await expect(
            page.getByText('Les mots de passe ne correspondent pas.'),
        ).toBeVisible();
    });
});
