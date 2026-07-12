import { expect, test, type Page } from '@playwright/test';

import {
    ADMIN_CREDENTIALS,
    CONTENT_MANAGER_CREDENTIALS,
    DEMO_ORG_NAME,
    SUPER_ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';
import { createCleanupTracker, extractDashboardEntityId, uniqueE2eEmail, uniqueE2eName } from './helpers/data';
import { confirmAlertDialog } from './helpers/ui';

const createdUserIds = createCleanupTracker<string>();

async function filterUsers(page: Page, query: string) {
    const search = page.getByPlaceholder('Rechercher un utilisateur...');
    await expect(search).toBeVisible();
    await search.click();
    await search.fill(query);
}

async function createUser(
    page: Page,
    params: {
        name: string;
        email: string;
        description: string;
    },
) {
    await page.goto('/dashboard/users/new');
    await page.getByLabel('Nom complet').fill(params.name);
    await page.getByLabel('Email').fill(params.email);
    await page.getByLabel('Description').fill(params.description);
    await page.getByLabel('Mot de passe initial').fill('DevPassword123!');
    await page.getByLabel('Confirmer le mot de passe').fill('DevPassword123!');
    await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();
    await page.waitForURL((url) => /^\/dashboard\/users\/[^/]+$/.test(url.pathname) &&
        url.pathname !== '/dashboard/users/new');
    await expect(page.getByRole('heading', {name: params.name})).toBeVisible();
    return extractDashboardEntityId(page.url(), 'users');
}

async function deleteUserById(page: Page, userId: string) {
    await page.goto(`/dashboard/users/${userId}`);
    await page.getByRole('button', {name: 'Supprimer'}).click();
    await confirmAlertDialog(page);
    await expect(page.getByText('Utilisateur supprimé.')).toBeVisible();
}

test.describe('users', () => {
    test.beforeEach(async ({context}) => {
        await context.clearCookies();
        createdUserIds.clear();
    });

    test.afterEach(async ({page}) => {
        for (const userId of createdUserIds.unique()) {
            await deleteUserById(page, userId);
        }
        createdUserIds.clear();
    });

    test('blocks content managers access to user pages', async ({page}) => {
        await login(page, CONTENT_MANAGER_CREDENTIALS.email, CONTENT_MANAGER_CREDENTIALS.password);
        await page.goto('/dashboard/users');
        await expect(page).toHaveURL(/\/dashboard$/);

        await page.goto('/dashboard/users/new');
        await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('super admin sees empty state and can select an organization', async ({page}) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);
        await page.goto('/dashboard/users');
        await expect(page).toHaveURL(/\/dashboard\/users$/);

        await expect(
            page.getByText('Sélectionnez une organisation pour accéder à cette page.'),
        ).toBeVisible();

        await page.getByTestId('organization-select-trigger').click();
        await page.getByRole('option', {name: DEMO_ORG_NAME}).click();

        await expect(page.getByPlaceholder('Rechercher un utilisateur...')).toBeVisible();
    });

    test('list page supports filters and row actions', async ({page}, testInfo) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const userName = uniqueE2eName(testInfo.project.name, 'User', 'List');
        const userEmail = uniqueE2eEmail(testInfo.project.name, 'user-list');
        const userId = await createUser(page, {
            name: userName,
            email: userEmail,
            description: 'Gestionnaire e2e.',
        });
        createdUserIds.add(userId);

        await page.getByRole('link', {name: 'Retour'}).click();
        await expect(page).toHaveURL(/\/dashboard\/users$/);

        await filterUsers(page, userName);
        await expect(page.getByRole('link', {name: userName})).toBeVisible();

        await page.getByRole('button', {name: 'Filtres'}).click();
        await page.getByRole('menuitemradio', {name: 'Actifs', exact: true}).click();
        await expect(page.getByRole('link', {name: userName})).toBeVisible();

        await page.getByRole('button', {name: 'Réinitialiser'}).click();
        await filterUsers(page, userName);
        await expect(page.getByRole('link', {name: userName})).toBeVisible();
        await filterUsers(page, '');

        await filterUsers(page, userName);
        const row = page.getByRole('row', {name: new RegExp(userName)});
        await row.getByRole('button', {name: 'Ouvrir le menu'}).click();
        await expect(page.getByRole('menuitem', {name: 'Voir la fiche'})).toBeVisible();
        await expect(page.getByRole('menuitem', {name: 'Modifier'})).toBeVisible();
        await page.keyboard.press('Escape');

        await row.getByRole('link', {name: userName}).click();
        await expect(page.getByRole('heading', {name: userName})).toBeVisible();

        await page.getByRole('link', {name: 'Retour'}).click();
        await expect(page).toHaveURL(/\/dashboard\/users$/);

        await filterUsers(page, userName);
        const rowAfterReturn = page.getByRole('row', {name: new RegExp(userName)});
        await rowAfterReturn.getByRole('button', {name: 'Ouvrir le menu'}).click();
        await page.getByRole('menuitem', {name: 'Modifier'}).click();
        await expect(page).toHaveURL((url) => url.pathname === `/dashboard/users/${userId}/edit`);
        await page.getByRole('link', {name: 'Annuler'}).click();
        await expect(page).toHaveURL((url) => url.pathname === `/dashboard/users/${userId}`);
    });

    test('create, edit, toggle, and delete user flow', async ({page}, testInfo) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const userName = uniqueE2eName(testInfo.project.name, 'User', 'Flow');
        const userEmail = uniqueE2eEmail(testInfo.project.name, 'user-flow');
        const userId = await createUser(page, {
            name: userName,
            email: userEmail,
            description: 'Utilisateur à modifier.',
        });
        createdUserIds.add(userId);
        await expect(page.getByRole('heading', {name: userName})).toBeVisible();

        await page.getByRole('button', {name: 'Désactiver'}).click();
        await expect(page.getByText('Utilisateur désactivé.')).toBeVisible();
        await expect(page.getByText('Inactif')).toBeVisible();

        await page.getByRole('link', {name: 'Modifier'}).click();
        await page.getByLabel('Description').fill('Description mise à jour.');
        await page.getByRole('button', {name: 'Enregistrer'}).click();
        await expect(page.getByText('Utilisateur mis à jour.')).toBeVisible();
        await expect(page.getByText('Description mise à jour.')).toBeVisible();

        await page.getByRole('button', {name: 'Supprimer'}).click();
        await confirmAlertDialog(page);
        await expect(page.getByText('Utilisateur supprimé.')).toBeVisible();
        createdUserIds.remove(userId);
    });
});
