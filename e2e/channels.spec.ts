import { expect, Page, test } from '@playwright/test';

import {
    ADMIN_CREDENTIALS,
    CONTENT_MANAGER_CREDENTIALS,
    SUPER_ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';
import { createChannel, deleteChannelById } from './helpers/channels';
import { createCleanupTracker, uniqueE2eName } from './helpers/data';
import { confirmAlertDialog } from './helpers/ui';

const createdChannelIds = createCleanupTracker<string>();

async function filterChannels(page: Page, query: string) {
    const search = page.getByPlaceholder('Rechercher un canal...');
    await expect(search).toBeVisible();
    await search.click();
    await search.fill(query);
}

test.describe('channels', () => {
    test.describe.configure({mode: 'serial'});

    test.beforeEach(async ({context}) => {
        await context.clearCookies();
        createdChannelIds.clear();
    });

    test.afterEach(async ({page}) => {
        if (createdChannelIds.isEmpty) return;
        for (const channelId of createdChannelIds.unique()) {
            await deleteChannelById(page, channelId);
        }
        createdChannelIds.clear();
    });

    test('super admin must select an organization before accessing channels pages', async ({page}) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);
        await page.goto('/dashboard/channels');

        await expect(
            page.getByText('Sélectionnez une organisation pour accéder à cette page.'),
        ).toBeVisible();
        await expect(page.getByRole('combobox')).toBeVisible();
    });

    test('content manager can read channels but cannot access creation page', async ({page}) => {
        await login(page, CONTENT_MANAGER_CREDENTIALS.email, CONTENT_MANAGER_CREDENTIALS.password);
        await page.goto('/dashboard/channels');

        await expect(page.getByRole('link', {name: 'Créer'})).toHaveCount(0);

        await filterChannels(page, 'Hall');
        const firstChannelLink = page.getByRole('link').first();
        await expect(firstChannelLink).toBeVisible();

        await page.goto('/dashboard/channels/new');
        await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('list page supports search, filters, reset and row actions', async ({page}) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
        await page.goto('/dashboard/channels');

        await filterChannels(page, 'Hall');
        await expect(page.getByRole('link', {name: /Hall/i}).first()).toBeVisible();

        await page.getByRole('button', {name: 'Filtres'}).click();
        await page.getByRole('menuitemradio', {name: 'Avec écrans'}).click();
        await expect(page.getByRole('link', {name: /Hall/i}).first()).toBeVisible();

        await page.getByRole('button', {name: 'Filtres'}).click();
        await page.getByRole('menuitemradio', {name: 'Nom Z-A'}).click();

        await page.getByRole('button', {name: 'Réinitialiser'}).click();
        await expect(page.getByPlaceholder('Rechercher un canal...')).toHaveValue('');

        await filterChannels(page, 'Hall');
        await page.getByRole('button', {name: 'Ouvrir le menu'}).first().click();
        await expect(page.getByRole('menuitem', {name: 'Voir la fiche'})).toBeVisible();
        await expect(page.getByRole('menuitem', {name: 'Modifier infos'})).toBeVisible();
        await expect(page.getByRole('menuitem', {name: 'Supprimer'})).toBeVisible();
    });

    test('admin can create, edit and delete a channel', async ({page}, testInfo) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const channelName = uniqueE2eName(testInfo.project.name, 'Canal', 'Flow');
        const channelId = await createChannel(page, {
            name: channelName,
            description: 'Canal e2e à modifier et supprimer.',
            templateName: 'Template Dashboard 16:9',
        });
        createdChannelIds.add(channelId);

        await page.getByRole('link', {name: 'Modifier infos'}).click();
        await expect(page).toHaveURL((url) => url.pathname === `/dashboard/channels/${channelId}/edit`);

        const updatedName = `${channelName} Modifié`;
        await page.getByLabel('Nom').fill(updatedName);

        const templateTrigger = page.getByRole('combobox').first();
        await templateTrigger.click();
        await page.getByRole('option').first().click();

        await page.getByRole('button', {name: 'Enregistrer'}).click();

        await expect(page).toHaveURL((url) => url.pathname === `/dashboard/channels/${channelId}`);
        await expect(page.getByRole('heading', {name: updatedName})).toBeVisible();
        await expect(page.getByText('Canal mis à jour.')).toBeVisible();
        await expect(page.getByText('Aperçu de diffusion', {exact: true})).toHaveCount(0);

        await page.getByRole('button', {name: 'Supprimer'}).first().click();
        await confirmAlertDialog(page);

        await page.waitForURL(/\/dashboard\/channels$/);
        await expect(page.getByText('Canal supprimé.')).toBeVisible();
        createdChannelIds.remove(channelId);
    });
});
