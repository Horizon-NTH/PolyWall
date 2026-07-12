import { expect, test, type Page } from '@playwright/test';

import {
    ADMIN_CREDENTIALS, CONTENT_MANAGER_CREDENTIALS, DEMO_ORG_NAME, SECOND_ORG_NAME,
    SUPER_ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';
import { createCleanupTracker, extractDashboardEntityId, uniqueE2eName } from './helpers/data';
import { confirmAlertDialog } from './helpers/ui';

const createdOrgIds = createCleanupTracker<string>();

async function filterOrganizations(page: Page, query: string) {
    const search = page.getByPlaceholder('Rechercher une organisation...');
    await expect(search).toBeVisible();
    await search.click();
    await search.fill(query);
}

async function createOrganization(
    page: Page,
    params: {
        name: string;
        description: string;
    },
) {
    await page.goto('/dashboard/organizations/new');
    await page.getByLabel('Nom').fill(params.name);
    await page.getByLabel('Description').fill(params.description);
    await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();
    await page.waitForURL((url) => /^\/dashboard\/organizations\/[^/]+$/.test(url.pathname) &&
        url.pathname !== '/dashboard/organizations/new');
    await expect(page.getByRole('heading', {name: params.name})).toBeVisible();
    const organizationId = extractDashboardEntityId(page.url(), 'organizations');
    await page.getByRole('link', {name: 'Retour'}).click();
    await expect(page).toHaveURL(/\/dashboard\/organizations$/);
    return organizationId;
}

async function deleteOrganizationById(page: Page, organizationId: string) {
    await page.goto(`/dashboard/organizations/${organizationId}`);
    await page.getByRole('button', {name: 'Supprimer'}).click();
    await confirmAlertDialog(page, 'Confirmer la suppression');
    await expect(page.getByText('Organisation supprimée.')).toBeVisible();
    await page.waitForURL(/\/dashboard\/organizations$/);
}

test.describe('organizations', () => {
    test.describe.configure({mode: 'serial'});

    test.beforeEach(async ({context}) => {
        await context.clearCookies();
        createdOrgIds.clear();
    });

    test.afterEach(async ({page}) => {
        if (createdOrgIds.isEmpty) return;
        for (const organizationId of createdOrgIds.unique()) {
            await deleteOrganizationById(page, organizationId);
        }
        createdOrgIds.clear();
    });

    [
        {role: 'admin', email: ADMIN_CREDENTIALS.email, password: ADMIN_CREDENTIALS.password},
        {role: 'manager', email: CONTENT_MANAGER_CREDENTIALS.email, password: CONTENT_MANAGER_CREDENTIALS.password},
    ].forEach(({role, email, password}) => {
        test(`blocks ${role} access to organization pages`, async ({page}) => {
            await login(page, email, password);
            await page.goto('/dashboard/organizations');
            await expect(page).toHaveURL(/\/dashboard$/);

            await page.goto('/dashboard/organizations/new');
            await expect(page).toHaveURL(/\/dashboard$/);
        });
    });

    test('list page supports search, filters, column toggles, and row actions', async ({page, context}, testInfo) => {
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
        const organizationId = await createOrganization(page, {
            name: orgName,
            description: 'Organisation créée pour les tests e2e.',
        });
        createdOrgIds.add(organizationId);

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
        const row = page.getByRole('row', {name: new RegExp(orgName)});
        await row.getByRole('button', {name: 'Ouvrir le menu'}).click();
        await page.getByRole('menuitem', {name: 'Copier l\'ID'}).click();

        await expect(page.getByText('ID copié.')).toBeVisible();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clipboardId = await page.evaluate(() => (window as any).__clipboardStore.text);
        expect(clipboardId).toBe(organizationId);

        await filterOrganizations(page, orgName);
        await page.getByRole('row', {name: new RegExp(orgName)})
            .getByRole('button', {name: 'Ouvrir le menu'})
            .click();
        await page.getByRole('menuitem', {name: 'Voir la fiche'}).click();
        await expect(page).toHaveURL(new RegExp(`/dashboard/organizations/${organizationId}(\\?.*)?$`));
        await expect(page.getByRole('heading', {name: orgName})).toBeVisible();

        await page.getByRole('link', {name: 'Retour'}).click();
        await expect(page).toHaveURL(/\/dashboard\/organizations$/);

        await filterOrganizations(page, orgName);
        await page.getByRole('row', {name: new RegExp(orgName)})
            .getByRole('button', {name: 'Ouvrir le menu'})
            .click();
        await page.getByRole('menuitem', {name: 'Modifier'}).click();
        await expect(page).toHaveURL(new RegExp(`/dashboard/organizations/${organizationId}/edit(\\?.*)?$`));
        await page.getByRole('link', {name: 'Annuler'}).click();
        await expect(page).toHaveURL(new RegExp(`/dashboard/organizations/${organizationId}(\\?.*)?$`));
    });

    test('create form shows validation errors and handles duplicate names', async ({page}) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);

        await page.goto('/dashboard/organizations/new');
        await page.getByLabel('Nom').fill('A');
        await page.getByLabel('Description').fill('B');
        await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();

        await expect(page.getByText('Le nom doit contenir au moins 2 caractères.')).toBeVisible();
        await expect(page.getByText('La description doit contenir au moins 2 caractères.')).toBeVisible();

        await page.getByLabel('Nom').fill(DEMO_ORG_NAME);
        await page.getByLabel('Description').fill('Organisation en double.');
        await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();
        await expect(page.getByText('Le nom est déjà utilisé.')).toBeVisible();
    });

    test('edit flow updates organization with validation and cancel handling', async ({page}, testInfo) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);

        const orgName = uniqueE2eName(testInfo.project.name, 'Organisation', 'Edit');
        const orgId = await createOrganization(page, {
            name: orgName,
            description: 'Organisation à modifier.',
        });
        createdOrgIds.add(orgId);

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

        await expect(page).toHaveURL(new RegExp(`/dashboard/organizations/${orgId}$`));
        await expect(page.getByRole('heading', {name: updatedName})).toBeVisible();

        await page.getByRole('link', {name: 'Modifier'}).click();
        await page.getByRole('link', {name: 'Annuler'}).click();
        await page.waitForURL(new RegExp(`/dashboard/organizations/${orgId}$`));
    });

    test('delete is blocked when linked data exists and works for empty orgs', async ({page}, testInfo) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);

        await page.goto('/dashboard/organizations');
        await page.getByRole('button', {name: 'Filtres'}).click();
        await page.getByRole('menuitemradio', {name: 'Avec utilisateurs'}).click();
        const linkedOrganization = page.getByRole('table').getByRole('link').first();
        await expect(linkedOrganization).toBeVisible();
        await linkedOrganization.click();
        await expect(page.getByText('Cette organisation contient encore des données.'))
            .toBeVisible();
        await expect(page.getByRole('button', {name: 'Supprimer'})).toBeDisabled();

        const orgName = uniqueE2eName(testInfo.project.name, 'Organisation', 'Delete');
        const orgId = await createOrganization(page, {
            name: orgName,
            description: 'Organisation à supprimer.',
        });

        await page.goto(`/dashboard/organizations/${orgId}`);
        await expect(page.getByRole('button', {name: 'Supprimer'})).toBeEnabled();
        await page.getByRole('button', {name: 'Supprimer'}).click();
        await expect(page.getByText('Supprimer cette organisation ?')).toBeVisible();
        await page.getByRole('button', {name: 'Annuler'}).click();
        await expect(page.getByRole('heading', {name: orgName})).toBeVisible();

        await page.getByRole('button', {name: 'Supprimer'}).click();
        await confirmAlertDialog(page, 'Confirmer la suppression');
        await expect(page.getByText('Organisation supprimée.')).toBeVisible();
        await page.waitForURL(/\/dashboard\/organizations$/);
        await expect(page.getByRole('link', {name: orgName})).toHaveCount(0);
    });
});
