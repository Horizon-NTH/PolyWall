import { expect, test } from '@playwright/test';

import {
    ADMIN_CREDENTIALS, CONTENT_MANAGER_CREDENTIALS, DEMO_ORG_NAME, SECOND_ORG_NAME,
    SUPER_ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';
import { createCleanupTracker, uniqueE2eName } from './helpers/data';

const createdOrgNames = createCleanupTracker<string>();

async function filterOrganizations(page: Parameters<typeof login>[0], query: string) {
    const search = page.getByPlaceholder('Rechercher une organisation...');
    await search.click();
    await search.fill(query);
}

async function getOrganizationIdFromTable(
    page: Parameters<typeof login>[0],
    name?: string,
) {
    const table = page.getByRole('table');
    const link = name
        ? table.getByRole('link', {name}).first()
        : table.getByRole('link').first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    const errorMessage = name
        ? `Missing organization link for ${name}`
        : 'Missing organization link for first row';
    if (!href) throw new Error(errorMessage);
    return new URL(href, 'http://localhost').pathname.split('/').pop() ?? '';
}

async function createOrganization(
    page: Parameters<typeof login>[0],
    name: string,
    description: string,
) {
    await page.goto('/dashboard/organizations/new');
    await page.getByLabel('Nom').fill(name);
    await page.getByLabel('Description').fill(description);
    await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();
    await page.waitForURL('**/dashboard/organizations');
    await filterOrganizations(page, name);
    await expect(page.getByRole('link', {name})).toBeVisible();
    await filterOrganizations(page, '');
}

async function getOrganizationIdFromList(page: Parameters<typeof login>[0], name: string) {
    if (!page.url().includes('/dashboard/organizations')) {
        await page.goto('/dashboard/organizations');
    }
    await filterOrganizations(page, name);
    const link = page.getByRole('link', {name}).first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    await filterOrganizations(page, '');
    if (!href) throw new Error(`Missing organization link for ${name}`);
    return new URL(href, 'http://localhost').pathname.split('/').pop() ?? '';
}

async function deleteOrganizationByName(page: Parameters<typeof login>[0], name: string) {
    await page.goto('/dashboard/organizations');
    await filterOrganizations(page, name);
    const link = page.getByRole('link', {name}).first();
    if (await link.count() === 0) {
        await filterOrganizations(page, '');
        return;
    }
    const orgId = await getOrganizationIdFromList(page, name);
    await page.goto(`/dashboard/organizations/${orgId}`);
    await page.getByRole('button', {name: 'Supprimer'}).click();
    await page.getByRole('button', {name: 'Confirmer la suppression'}).click();
    await expect(page.getByText('Organisation supprimée.')).toBeVisible();
    await expect(page.getByRole('link', {name})).toHaveCount(0);
    await filterOrganizations(page, '');
}

test.describe('organizations', () => {
    test.describe.configure({mode: 'serial'});

    test.beforeEach(async ({context}) => {
        await context.clearCookies();
        createdOrgNames.clear();
    });

    test.afterEach(async ({page}) => {
        if (createdOrgNames.isEmpty) return;
        for (const name of createdOrgNames.unique()) {
            await deleteOrganizationByName(page, name);
        }
        createdOrgNames.clear();
    });

    [
        {role: 'admin', email: ADMIN_CREDENTIALS.email, password: ADMIN_CREDENTIALS.password},
        {role: 'manager', email: CONTENT_MANAGER_CREDENTIALS.email, password: CONTENT_MANAGER_CREDENTIALS.password},
    ].forEach(async ({role, email, password}) => {
        test(`blocks ${role} access to organization pages`, async ({page}) => {
            await login(page, email, password);
            await page.goto('/dashboard/organizations');
            await expect(page).toHaveURL(/\/dashboard$/);

            await page.goto('/dashboard/organizations/new');
            await expect(page).toHaveURL(/\/dashboard$/);
        });
    });

    test('list page supports search, filters, column toggles, and row actions', async ({
                                                                                           page,
                                                                                           context,
                                                                                       }, testInfo) => {
        await context.addInitScript(() => {
            const store = {text: ''};
            Object.defineProperty(navigator, 'clipboard', {
                value: {
                    writeText: async (text: string) => {
                        store.text = text;
                    },
                    readText: async () => store.text,
                },
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__clipboardStore = store;
        });
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);

        const orgName = uniqueE2eName(testInfo.project.name, 'Organisation', 'List');
        await createOrganization(page, orgName, 'Organisation créée pour les tests e2e.');
        createdOrgNames.add(orgName);

        await filterOrganizations(page, 'Second');
        await expect(page.getByRole('link', {name: SECOND_ORG_NAME})).toBeVisible();
        await expect(page.getByRole('link', {name: DEMO_ORG_NAME})).toHaveCount(0);

        await filterOrganizations(page, orgName);
        await expect(page.getByRole('link', {name: orgName})).toBeVisible();
        await expect(page.getByRole('link', {name: SECOND_ORG_NAME})).toHaveCount(0);

        await filterOrganizations(page, '');

        await page.getByRole('button', {name: 'Filtres'}).click();
        await page.getByRole('menuitemradio', {name: 'Sans utilisateurs'}).click();
        await page.getByRole('button', {name: 'Filtres'}).click();
        await page.getByRole('menuitemradio', {name: 'Sans écrans'}).click();
        await filterOrganizations(page, orgName);
        await expect(page.getByRole('link', {name: orgName})).toBeVisible();
        await expect(page.getByRole('link', {name: DEMO_ORG_NAME})).toHaveCount(0);
        await filterOrganizations(page, '');

        await page.getByRole('button', {name: 'Réinitialiser'}).click();
        await filterOrganizations(page, DEMO_ORG_NAME);
        await expect(page.getByRole('link', {name: DEMO_ORG_NAME})).toBeVisible();
        await filterOrganizations(page, '');

        await page.getByRole('button', {name: 'Colonnes'}).click();
        await page.getByRole('menuitemcheckbox', {name: 'Canaux'}).click();
        await expect(page.getByRole('columnheader', {name: 'Canaux'})).toHaveCount(0);
        await page.getByRole('button', {name: 'Colonnes'}).click();
        await page.getByRole('menuitemcheckbox', {name: 'Canaux'}).click();
        await expect(page.getByRole('columnheader', {name: 'Canaux'})).toBeVisible();

        await filterOrganizations(page, orgName);
        const expectedId = await getOrganizationIdFromTable(page, orgName);
        const row = page.getByRole('row', {name: new RegExp(orgName)});
        await row.getByRole('button', {name: 'Ouvrir le menu'}).click();
        await page.getByRole('menuitem', {name: 'Copier l\'ID'}).click();

        await expect(page.getByText('ID copié.')).toBeVisible();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clipboardId = await page.evaluate(() => (window as any).__clipboardStore.text);
        expect(clipboardId).toBe(expectedId);

        await filterOrganizations(page, orgName);
        await page.getByRole('row', {name: new RegExp(orgName)})
            .getByRole('button', {name: 'Ouvrir le menu'})
            .click();
        await page.getByRole('menuitem', {name: 'Voir la fiche'}).click();
        await expect(page).toHaveURL(new RegExp(`/dashboard/organizations/${expectedId}(\\?.*)?$`));
        await expect(page.getByRole('heading', {name: orgName})).toBeVisible();

        await page.getByRole('link', {name: 'Retour'}).click();
        await expect(page).toHaveURL(/\/dashboard\/organizations$/);

        await filterOrganizations(page, orgName);
        await page.getByRole('row', {name: new RegExp(orgName)})
            .getByRole('button', {name: 'Ouvrir le menu'})
            .click();
        await page.getByRole('menuitem', {name: 'Modifier'}).click();
        await expect(page).toHaveURL(new RegExp(`/dashboard/organizations/${expectedId}/edit(\\?.*)?$`));
        await page.getByRole('link', {name: 'Annuler'}).click();
        await expect(page).toHaveURL(new RegExp(`/dashboard/organizations/${expectedId}(\\?.*)?$`));
    });

    test('create form shows validation errors and handles duplicate names', async ({
                                                                                       page,
                                                                                   }, testInfo) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);

        await page.goto('/dashboard/organizations/new');
        await page.getByLabel('Nom').fill('A');
        await page.getByLabel('Description').fill('B');
        await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();

        if (testInfo.project.name !== 'webkit') {
            await expect(
                page.getByLabel('Nom'),
            ).toHaveAttribute('aria-invalid', 'true');
            await expect(
                page.getByLabel('Description'),
            ).toHaveAttribute('aria-invalid', 'true');
        } else {
            await expect(page).toHaveURL(/\/dashboard\/organizations\/new$/);
        }

        await page.getByLabel('Nom').fill(DEMO_ORG_NAME);
        await page.getByLabel('Description').fill('Organisation en double.');
        await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();
        await expect(page.getByText('Le nom est déjà utilisé.')).toBeVisible();
    });

    test('edit flow updates organization with validation and cancel handling', async ({
                                                                                          page,
                                                                                      }, testInfo) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);

        const orgName = uniqueE2eName(testInfo.project.name, 'Organisation', 'Edit');
        await createOrganization(page, orgName, 'Organisation à modifier.');
        createdOrgNames.add(orgName);
        const orgId = await getOrganizationIdFromList(page, orgName);

        await page.goto(`/dashboard/organizations/${orgId}/edit`);
        await page.getByLabel('Nom').fill('A');
        await page.getByLabel('Description').fill('B');
        await page.getByRole('button', {name: 'Enregistrer'}).click();

        await expect(
            page.getByText('Le nom doit contenir au moins 2 caractères.'),
        ).toBeVisible();
        await expect(
            page.getByText('La description doit contenir au moins 2 caractères.'),
        ).toBeVisible();

        await page.getByLabel('Nom').fill(DEMO_ORG_NAME);
        await page.getByLabel('Description').fill('Tentative de doublon.');
        await page.getByRole('button', {name: 'Enregistrer'}).click();
        await expect(page.getByText('Le nom est déjà utilisé.')).toBeVisible();

        const updatedName = `${orgName} Modifié`;
        await page.getByLabel('Nom').fill(updatedName);
        await page.getByLabel('Description').fill('Description mise à jour.');
        await page.getByRole('button', {name: 'Enregistrer'}).click();
        createdOrgNames.add(updatedName);

        await expect(page).toHaveURL(new RegExp(`/dashboard/organizations/${orgId}$`));
        await expect(page.getByRole('heading', {name: updatedName})).toBeVisible();

        await page.getByRole('link', {name: 'Modifier'}).click();
        await page.getByRole('link', {name: 'Annuler'}).click();
        await page.waitForURL(new RegExp(`/dashboard/organizations/${orgId}$`), {timeout: 15000});
    });

    test('delete is blocked when linked data exists and works for empty orgs', async ({
                                                                                          page,
                                                                                      }, testInfo) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);

        await page.goto('/dashboard/organizations');
        await page.getByRole('button', {name: 'Filtres'}).click();
        await page.getByRole('menuitemradio', {name: 'Avec utilisateurs'}).click();
        const linkedOrgId = await getOrganizationIdFromTable(page);
        await page.goto(`/dashboard/organizations/${linkedOrgId}`);
        await expect(page.getByText('Cette organisation contient encore des données.'))
            .toBeVisible();
        await expect(page.getByRole('button', {name: 'Supprimer'})).toBeDisabled();

        const orgName = uniqueE2eName(testInfo.project.name, 'Organisation', 'Delete');
        await createOrganization(page, orgName, 'Organisation à supprimer.');
        createdOrgNames.add(orgName);
        const orgId = await getOrganizationIdFromList(page, orgName);

        await page.goto(`/dashboard/organizations/${orgId}`);
        await expect(page.getByRole('button', {name: 'Supprimer'})).toBeEnabled();
        await page.getByRole('button', {name: 'Supprimer'}).click();
        await expect(page.getByText('Supprimer cette organisation ?')).toBeVisible();
        await page.getByRole('button', {name: 'Annuler'}).click();
        await expect(page.getByRole('heading', {name: orgName})).toBeVisible();

        await page.getByRole('button', {name: 'Supprimer'}).click();
        await page.getByRole('button', {name: 'Confirmer la suppression'}).click();
        await expect(page.getByText('Organisation supprimée.')).toBeVisible();
        await page.waitForURL(/\/dashboard\/organizations$/, {timeout: 15000});
        await expect(page.getByRole('link', {name: orgName})).toHaveCount(0);
    });
});
