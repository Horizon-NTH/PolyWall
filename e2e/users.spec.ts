import { expect, test } from '@playwright/test';

import {
    ADMIN_CREDENTIALS,
    CONTENT_MANAGER_CREDENTIALS,
    DEMO_ORG_NAME,
    SUPER_ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';

function buildUniqueUserName(projectName: string, suffix: string) {
    return `PW E2E ${projectName} User ${Date.now()} ${suffix}`;
}

function buildUniqueUserEmail(projectName: string, suffix: string) {
    return `pw-e2e-${projectName}-${Date.now()}-${suffix}@polywall.test`;
}

const createdUserNames: string[] = [];

function trackUser(name: string) {
    createdUserNames.push(name);
}

async function ensureUsersList(page: Parameters<typeof login>[0]) {
    if (/\/dashboard\/users$/.test(page.url())) {
        await page.waitForLoadState('domcontentloaded');
        return;
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            await page.goto('/dashboard/users', {waitUntil: 'domcontentloaded'});
            break;
        } catch (error) {
            const message = String(error);
            if (
                message.includes('NS_BINDING_ABORTED') ||
                message.includes('interrupted by another navigation')
            ) {
                await page.waitForLoadState('domcontentloaded');
                continue;
            }
            throw error;
        }
    }

    await page.waitForURL(/\/dashboard\/users$/, {timeout: 15000});
}

async function filterUsers(page: Parameters<typeof login>[0], query: string) {
    await ensureUsersList(page);
    const search = page.getByPlaceholder('Rechercher un utilisateur...');
    await expect(search).toBeVisible();
    const modifierKey = process.platform === 'darwin' ? 'Meta' : 'Control';
    for (let attempt = 0; attempt < 3; attempt += 1) {
        await search.fill(query);
        await page.waitForTimeout(50);
        if ((await search.inputValue()) === query) break;
        await search.press(`${modifierKey}+A`);
        await search.fill(query);
        await page.waitForTimeout(50);
        if ((await search.inputValue()) === query) break;
    }
    await expect(search).toHaveValue(query);
}

async function getUserIdFromList(page: Parameters<typeof login>[0], name: string) {
    await page.goto('/dashboard/users');
    await filterUsers(page, name);
    const link = page.getByRole('link', {name}).first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    await filterUsers(page, '');
    if (!href) throw new Error(`Missing user link for ${name}`);
    return new URL(href, 'http://localhost').pathname.split('/').pop() ?? '';
}

async function createUser(
    page: Parameters<typeof login>[0],
    name: string,
    email: string,
    description: string,
) {
    await page.goto('/dashboard/users/new');
    await page.getByLabel('Nom complet').fill(name);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Description').fill(description);
    await page.getByLabel('Mot de passe initial').fill('DevPassword123!');
    await page.getByLabel('Confirmer le mot de passe').fill('DevPassword123!');
    await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();
    await page.waitForURL('**/dashboard/users');
}

async function deleteUserByName(page: Parameters<typeof login>[0], name: string) {
    if (page.isClosed()) return;
    await ensureUsersList(page);
    await filterUsers(page, name);
    const link = page.getByRole('link', {name}).first();
    if (await link.count() === 0) {
        await filterUsers(page, '');
        return;
    }

    const userId = await getUserIdFromList(page, name);
    await page.goto(`/dashboard/users/${userId}`);
    await page.getByRole('button', {name: 'Supprimer'}).click();
    const deleteDialog = page.getByRole('alertdialog');
    await deleteDialog.getByRole('button', {name: 'Supprimer'}).click();
    await expect(page.getByText('Utilisateur supprimé.')).toBeVisible();
    await page.waitForURL(/\/dashboard\/users$/, {timeout: 15000});
    await filterUsers(page, name);
    await expect(page.getByRole('link', {name})).toHaveCount(0);
    await filterUsers(page, '');
}

test.describe('users', () => {
    test.beforeEach(async ({context}) => {
        await context.clearCookies();
        createdUserNames.length = 0;
    });

    test.afterEach(async ({page}) => {
        if (createdUserNames.length === 0) return;
        for (const name of new Set(createdUserNames)) {
            await deleteUserByName(page, name);
        }
        createdUserNames.length = 0;
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

        const userName = buildUniqueUserName(testInfo.project.name, 'List');
        const userEmail = buildUniqueUserEmail(testInfo.project.name, 'list');
        await createUser(page, userName, userEmail, 'Gestionnaire e2e.');
        trackUser(userName);

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
        await Promise.all([
            page.waitForURL(/\/dashboard\/users\/.+\/edit(\?.*)?$/),
            page.getByRole('menuitem', {name: 'Modifier'}).click(),
        ]);
        await expect(page).toHaveURL(/\/dashboard\/users\/.+\/edit(\?.*)?$/);
        await page.getByRole('link', {name: 'Annuler'}).click();
        await expect(page).toHaveURL(/\/dashboard\/users\/.+(\?.*)?$/);
    });

    test('create, edit, toggle, and delete user flow', async ({page}, testInfo) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const userName = buildUniqueUserName(testInfo.project.name, 'Flow');
        const userEmail = buildUniqueUserEmail(testInfo.project.name, 'flow');
        await createUser(page, userName, userEmail, 'Utilisateur à modifier.');
        trackUser(userName);

        const userId = await getUserIdFromList(page, userName);
        await page.goto(`/dashboard/users/${userId}`);
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
        const deleteDialog = page.getByRole('alertdialog');
        await deleteDialog.getByRole('button', {name: 'Supprimer'}).click();
        await page.waitForURL(/\/dashboard\/users$/, {timeout: 15000});
        await expect(page.getByText('Utilisateur supprimé.')).toBeVisible();
        createdUserNames.length = 0;
    });
});
