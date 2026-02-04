import { expect, test } from '@playwright/test';

import {
    ADMIN_CREDENTIALS,
    CONTENT_MANAGER_CREDENTIALS,
    DEMO_ORG_NAME,
    SUPER_ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';

function buildUniqueAdminName(projectName: string, suffix: string) {
    return `PW E2E ${projectName} Admin ${Date.now()} ${suffix}`;
}

function buildUniqueAdminEmail(projectName: string, suffix: string) {
    return `pw-e2e-${projectName}-${Date.now()}-${suffix}@polywall.test`;
}

const createdAdminNames: string[] = [];

function trackAdmin(name: string) {
    createdAdminNames.push(name);
}

async function filterAdmins(page: Parameters<typeof login>[0], query: string) {
    const search = page.getByPlaceholder('Rechercher un administrateur...');
    await search.fill(query);
}

async function getAdminIdFromList(page: Parameters<typeof login>[0], name: string) {
    if (!page.url().includes('/dashboard/administrators')) {
        await page.goto('/dashboard/administrators');
    }
    await filterAdmins(page, name);
    const link = page.getByRole('link', {name}).first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    await filterAdmins(page, '');
    if (!href) throw new Error(`Missing admin link for ${name}`);
    return href.split('/').pop() ?? '';
}

async function createAdmin(
    page: Parameters<typeof login>[0],
    name: string,
    email: string,
    description: string,
    orgName: string,
) {
    await page.goto('/dashboard/administrators/new');
    await page.getByLabel('Nom complet').fill(name);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Description').fill(description);

    const orgTrigger = page
        .getByRole('combobox')
        .filter({hasText: 'Sélectionner une organisation'});
    if (await orgTrigger.count()) {
        await orgTrigger.first().click();
    } else {
        await page.getByText('Sélectionner une organisation').first().click();
    }
    await page.getByRole('option', {name: orgName}).click();

    await page.getByLabel('Mot de passe initial').fill('DevPassword123!');
    await page.getByLabel('Confirmer le mot de passe').fill('DevPassword123!');
    await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();
    await page.waitForURL('**/dashboard/administrators');
}

async function deleteAdminByName(page: Parameters<typeof login>[0], name: string) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            await page.goto('/dashboard/administrators', {waitUntil: 'domcontentloaded'});
        } catch {
        }
        await page.waitForURL(/\/dashboard\/administrators(\/.*)?$/, {timeout: 15000});
        if (page.url().endsWith('/dashboard/administrators')) {
            break;
        }
    }
    if (!page.url().endsWith('/dashboard/administrators')) {
        await page.goto('/dashboard/administrators', {waitUntil: 'domcontentloaded'});
    }
    await filterAdmins(page, name);
    const link = page.getByRole('link', {name}).first();
    if (await link.count() === 0) {
        await filterAdmins(page, '');
        return;
    }

    const adminId = await getAdminIdFromList(page, name);
    await page.goto(`/dashboard/administrators/${adminId}`);
    await page.getByRole('button', {name: 'Supprimer'}).click();
    const deleteDialog = page.getByRole('alertdialog');
    await deleteDialog.getByRole('button', {name: 'Supprimer'}).click();
    await expect(page.getByText('Administrateur supprimé.')).toBeVisible();
    await page.waitForURL(/\/dashboard\/administrators$/, {timeout: 15000});
    await filterAdmins(page, name);
    await expect(page.getByRole('link', {name})).toHaveCount(0);
    await filterAdmins(page, '');
}

test.describe('administrators', () => {
    test.beforeEach(async ({context}) => {
        await context.clearCookies();
        createdAdminNames.length = 0;
    });

    test.afterEach(async ({page}) => {
        if (createdAdminNames.length === 0) return;
        for (const name of new Set(createdAdminNames)) {
            await deleteAdminByName(page, name);
        }
        createdAdminNames.length = 0;
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

        const adminName = buildUniqueAdminName(testInfo.project.name, 'List');
        const adminEmail = buildUniqueAdminEmail(testInfo.project.name, 'list');
        await createAdmin(page, adminName, adminEmail, 'Administrateur e2e.', DEMO_ORG_NAME);
        trackAdmin(adminName);

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
        await expect(page).toHaveURL(/\/dashboard\/administrators\/.*\/edit$/);
        await page.getByRole('link', {name: 'Annuler'}).click();
        await expect(page).toHaveURL(/\/dashboard\/administrators\/.*$/);
    });

    test('create, edit, toggle, and delete admin flow', async ({page}, testInfo) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);

        const adminName = buildUniqueAdminName(testInfo.project.name, 'Flow');
        const adminEmail = buildUniqueAdminEmail(testInfo.project.name, 'flow');
        await createAdmin(page, adminName, adminEmail, 'Administrateur à modifier.', DEMO_ORG_NAME);
        trackAdmin(adminName);

        const adminId = await getAdminIdFromList(page, adminName);
        await page.goto(`/dashboard/administrators/${adminId}`);
        await expect(page.getByRole('heading', {name: adminName})).toBeVisible();

        await page.getByRole('button', {name: 'Désactiver'}).click();
        await expect(page.getByText('Administrateur désactivé.')).toBeVisible();
        await expect(page.getByText('Inactif')).toBeVisible();

        await page.getByRole('link', {name: 'Modifier'}).click();
        await page.getByLabel('Description').fill('Description mise à jour.');
        await page.getByRole('button', {name: 'Enregistrer'}).click();
        await expect(page.getByText('Administrateur mis à jour.')).toBeVisible();
        await expect(page.getByText('Description mise à jour.')).toBeVisible();

        await page.getByRole('button', {name: 'Supprimer'}).click();
        const deleteDialog = page.getByRole('alertdialog');
        await deleteDialog.getByRole('button', {name: 'Supprimer'}).click();
        await expect(page.getByText('Administrateur supprimé.')).toBeVisible();
        await page.waitForURL(/\/dashboard\/administrators$/, {timeout: 15000});
        createdAdminNames.length = 0;
    });
});
