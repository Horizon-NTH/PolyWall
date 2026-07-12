import { expect, Page, test } from '@playwright/test';

import {
    ADMIN_CREDENTIALS,
    CONTENT_MANAGER_CREDENTIALS,
    DEMO_ORG_NAME,
    SUPER_ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';
import { createCleanupTracker, extractDashboardEntityId, uniqueE2eEmail, uniqueE2eName } from './helpers/data';
import { confirmAlertDialog } from './helpers/ui';

const createdAdminIds = createCleanupTracker<string>();

async function filterAdmins(page: Page, query: string) {
    const search = page.getByPlaceholder('Rechercher un administrateur...');
    await expect(search).toBeVisible();
    await search.click();
    await search.fill(query);
}

async function createAdmin(page: Page, params: { name: string, email: string, description: string, orgName: string }) {
    await page.goto('/dashboard/administrators/new');
    await page.getByLabel('Nom complet').fill(params.name);
    await page.getByLabel('Email').fill(params.email);
    await page.getByLabel('Description').fill(params.description);

    await page.getByRole('combobox').filter({hasText: 'Sélectionner une organisation'}).click();
    await page.getByRole('option', {name: params.orgName}).click();

    await page.getByLabel('Mot de passe initial').fill('DevPassword123!');
    await page.getByLabel('Confirmer le mot de passe').fill('DevPassword123!');
    await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();
    await page.waitForURL(/\/dashboard\/administrators\/(?!new(?:\/|$))[^/]+(?:\?.*)?$/);
    const id = extractDashboardEntityId(page.url(), 'administrators');
    await page.getByRole('link', {name: 'Retour'}).click();
    return id;
}

async function deleteAdminById(page: Page, adminId: string) {
    await page.goto(`/dashboard/administrators/${adminId}`);
    await page.getByRole('button', {name: 'Supprimer'}).click();
    await confirmAlertDialog(page);
    await expect(page.getByText('Administrateur supprimé.')).toBeVisible();
    await page.waitForURL(/\/dashboard\/administrators$/);
}

test.describe('administrators', () => {
    test.beforeEach(async ({context}) => {
        await context.clearCookies();
        createdAdminIds.clear();
    });

    test.afterEach(async ({page}) => {
        if (createdAdminIds.isEmpty) return;
        for (const adminId of createdAdminIds.unique()) {
            await deleteAdminById(page, adminId);
        }
        createdAdminIds.clear();
    });

    [
        {role: 'admin', email: ADMIN_CREDENTIALS.email, password: ADMIN_CREDENTIALS.password},
        {role: 'manager', email: CONTENT_MANAGER_CREDENTIALS.email, password: CONTENT_MANAGER_CREDENTIALS.password},
    ].forEach(({role, email, password}) => {
        test(`blocks ${role} access to administrator pages`, async ({page}) => {
            await login(page, email, password);
            await page.goto('/dashboard/administrators');
            await expect(page).toHaveURL(/\/dashboard$/);

            await page.goto('/dashboard/administrators/new');
            await expect(page).toHaveURL(/\/dashboard$/);
        });
    });

    test('list page supports filters, columns, and row actions', async ({page}, testInfo) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);

        const adminName = uniqueE2eName(testInfo.project.name, 'Admin', 'List');
        const adminEmail = uniqueE2eEmail(testInfo.project.name, 'admin-list');
        const adminId = await createAdmin(page, {
            name: adminName,
            email: adminEmail,
            description: 'Administrateur e2e.',
            orgName: DEMO_ORG_NAME,
        });
        createdAdminIds.add(adminId);

        await filterAdmins(page, adminName);
        await expect(page.getByRole('link', {name: adminName})).toBeVisible();

        await page.getByRole('button', {name: 'Filtres'}).click();
        await page.getByRole('menuitemradio', {name: 'Admins organisation', exact: true}).click();
        await page.getByRole('button', {name: 'Filtres'}).click();
        await page.getByRole('menuitemradio', {name: 'Actifs', exact: true}).click();
        await page.getByRole('button', {name: 'Filtres'}).click();
        await page.getByRole('menuitemradio', {name: DEMO_ORG_NAME, exact: true}).click();
        await expect(page.getByRole('link', {name: adminName})).toBeVisible();

        await page.getByRole('button', {name: 'Réinitialiser'}).click();
        await filterAdmins(page, adminName);
        await expect(page.getByRole('link', {name: adminName})).toBeVisible();
        await filterAdmins(page, '');

        await page.getByRole('button', {name: 'Colonnes'}).click();
        await page.getByRole('menuitemcheckbox', {name: 'Organisation'}).click();
        await expect(page.getByRole('columnheader', {name: 'Organisation'})).toHaveCount(0);
        await page.getByRole('button', {name: 'Colonnes'}).click();
        await page.getByRole('menuitemcheckbox', {name: 'Organisation'}).click();
        await expect(page.getByRole('columnheader', {name: 'Organisation'})).toBeVisible();

        await filterAdmins(page, adminName);
        const row = page.getByRole('row', {name: new RegExp(adminName)});
        await row.getByRole('button', {name: 'Ouvrir le menu'}).click();
        await page.getByRole('menuitem', {name: 'Voir la fiche'}).click();
        await expect(page).toHaveURL(new RegExp(`/dashboard/administrators/`));
        await expect(page.getByRole('heading', {name: adminName})).toBeVisible();

        await page.getByRole('link', {name: 'Retour'}).click();
        await expect(page).toHaveURL(/\/dashboard\/administrators$/);

        await filterAdmins(page, adminName);
        const rowAfterReturn = page.getByRole('row', {name: new RegExp(adminName)});
        await rowAfterReturn.getByRole('button', {name: 'Ouvrir le menu'}).click();
        await page.getByRole('menuitem', {name: 'Modifier'}).click();
        await expect(page).toHaveURL(/\/dashboard\/administrators\/.*\/edit(\?.*)?$/);
        await page.getByRole('link', {name: 'Annuler'}).click();
        await expect(page).toHaveURL(/\/dashboard\/administrators\/.*(\?.*)?$/);
    });

    test('create, edit, toggle, and delete admin flow', async ({page}, testInfo) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);

        const adminName = uniqueE2eName(testInfo.project.name, 'Admin', 'Flow');
        const adminEmail = uniqueE2eEmail(testInfo.project.name, 'admin-flow');
        const adminId = await createAdmin(page, {
            name: adminName,
            email: adminEmail,
            description: 'Administrateur à modifier.',
            orgName: DEMO_ORG_NAME,
        });
        createdAdminIds.add(adminId);

        await filterAdmins(page, adminName);
        await page.getByRole('link', {name: adminName}).click();
        await expect(page).toHaveURL((url) => url.pathname === `/dashboard/administrators/${adminId}`);
        await expect(page.getByRole('heading', {name: adminName})).toBeVisible();

        await page.getByRole('button', {name: 'Désactiver'}).click();
        await expect(page.getByText('Administrateur désactivé.')).toBeVisible();
        await expect(page.getByText('Inactif')).toBeVisible();

        await page.getByRole('link', {name: 'Modifier'}).click();
        await expect(page).toHaveURL((url) => url.pathname === `/dashboard/administrators/${adminId}/edit`);
        await page.getByLabel('Description').fill('Description mise à jour.');
        await page.getByRole('button', {name: 'Enregistrer'}).click();
        await expect(page.getByText('Administrateur mis à jour.')).toBeVisible();
        await expect(page.getByText('Description mise à jour.')).toBeVisible();

        await page.getByRole('button', {name: 'Supprimer'}).click();
        await confirmAlertDialog(page);
        await expect(page.getByText('Administrateur supprimé.')).toBeVisible();
        await page.waitForURL(/\/dashboard\/administrators$/);
        createdAdminIds.clear();
    });
});
