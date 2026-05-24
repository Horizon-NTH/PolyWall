import { expect, test } from '@playwright/test';

import {
    ADMIN_CREDENTIALS,
    CONTENT_MANAGER_CREDENTIALS,
    SUPER_ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';
import { createCleanupTracker, extractDashboardEntityId, uniqueE2eName } from './helpers/data';
import { ensureDashboardPath, safeGoto } from './helpers/navigation';
import { confirmAlertDialog } from './helpers/ui';

const createdPlaylistIds = createCleanupTracker<string>();

async function filterPlaylists(page: Parameters<typeof login>[0], query: string) {
    await ensureDashboardPath(page, '/dashboard/playlists');
    const search = page.getByPlaceholder('Rechercher une playlist...');
    await expect(search).toBeVisible();
    await search.fill(query);
    await expect(search).toHaveValue(query);
}

async function createPlaylist(
    page: Parameters<typeof login>[0],
    params: {
        name: string;
        description: string;
    },
) {
    const createButton = page.getByRole('main').getByRole('button', {name: 'Créer'});

    for (let attempt = 0; attempt < 2; attempt += 1) {
        await safeGoto(page, '/dashboard/playlists/new');
        await page.waitForLoadState('networkidle');
        await page.getByLabel('Nom').fill(params.name);
        await page.getByLabel('Description').fill(params.description);

        await Promise.all([
            page.waitForURL(
                (url) => /^\/dashboard\/playlists\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith('/new'),
                {timeout: 12000, waitUntil: 'commit'},
            ).catch(() => null),
            createButton.click(),
        ]);

        if (/\/dashboard\/playlists\/(?!new$)([^/]+)$/.test(new URL(page.url()).pathname)) {
            break;
        }
    }

    await expect
        .poll(() => new URL(page.url()).pathname, {timeout: 20000})
        .toMatch(/^\/dashboard\/playlists\/(?!new$)[^/]+$/);

    const playlistId = extractDashboardEntityId(page.url(), 'playlists');
    await expect(page.getByRole('heading', {name: params.name})).toBeVisible();
    return playlistId;
}

async function deletePlaylistById(page: Parameters<typeof login>[0], playlistId: string) {
    if (page.isClosed()) return;
    await page.goto(`/dashboard/playlists/${playlistId}`);

    const deleteButton = page.getByRole('button', {name: 'Supprimer'}).first();
    if ((await deleteButton.count()) === 0) return;

    await deleteButton.click();
    await confirmAlertDialog(page);
    await page.waitForURL(/\/dashboard\/playlists$/, {timeout: 15000});
}

test.describe('playlists', () => {
    test.describe.configure({mode: 'serial'});

    test.beforeEach(async ({context}) => {
        await context.clearCookies();
        createdPlaylistIds.clear();
    });

    test.afterEach(async ({page}) => {
        if (createdPlaylistIds.isEmpty) return;
        for (const playlistId of createdPlaylistIds.unique()) {
            await deletePlaylistById(page, playlistId);
        }
        createdPlaylistIds.clear();
    });

    test('super admin must select an organization before accessing playlist pages', async ({page}) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);
        await safeGoto(page, '/dashboard/playlists');
        await expect(page).toHaveURL(/\/dashboard\/playlists$/);

        await expect(
            page.getByText('Sélectionnez une organisation pour accéder à cette page.'),
        ).toBeVisible();
        await expect(page.getByRole('combobox')).toBeVisible();
    });

    test('content manager can access playlists section', async ({page}) => {
        await login(page, CONTENT_MANAGER_CREDENTIALS.email, CONTENT_MANAGER_CREDENTIALS.password);
        await safeGoto(page, '/dashboard/playlists');
        await expect(page).toHaveURL(/\/dashboard\/playlists$/);
        await expect(page.getByPlaceholder('Rechercher une playlist...')).toBeVisible();

        await safeGoto(page, '/dashboard/playlists/new');
        await expect(page).toHaveURL(/\/dashboard\/playlists\/new$/);
        await expect(page.getByText('Nouvelle playlist')).toBeVisible();
    });

    test('list page supports search, filters, reset, and row actions', async ({page}, testInfo) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const playlistName = uniqueE2eName(testInfo.project.name, 'Playlist', 'List');
        const playlistId = await createPlaylist(page, {
            name: playlistName,
            description: 'Playlist e2e pour tester la liste.',
        });
        createdPlaylistIds.add(playlistId);

        await filterPlaylists(page, playlistName);
        await expect(page.getByRole('link', {name: playlistName})).toBeVisible();

        await page.getByRole('button', {name: 'Filtres'}).click();
        await page.getByRole('menuitemradio', {name: 'Sans inactifs'}).click();
        await expect(page.getByRole('link', {name: playlistName})).toBeVisible();

        await page.getByRole('button', {name: 'Filtres'}).click();
        await page.getByRole('menuitemradio', {name: 'Nom Z-A'}).click();
        await expect(page.getByRole('link', {name: playlistName})).toBeVisible();

        await page.getByRole('button', {name: 'Réinitialiser'}).click();
        await expect(page.getByPlaceholder('Rechercher une playlist...')).toHaveValue('');

        await filterPlaylists(page, playlistName);
        await page.getByRole('button', {name: 'Ouvrir le menu'}).first().click();
        await expect(page.getByRole('menuitem', {name: 'Voir la fiche'})).toBeVisible();
        await expect(page.getByRole('menuitem', {name: 'Modifier infos'})).toBeVisible();
        await expect(page.getByRole('menuitem', {name: 'Supprimer'})).toBeVisible();
        await page.getByRole('menuitem', {name: 'Voir la fiche'}).click();

        await expect(page).toHaveURL(new RegExp(`/dashboard/playlists/${playlistId}(\\?.*)?$`));
        await expect(page.getByRole('heading', {name: playlistName})).toBeVisible();
        await expect(page.getByText('Timeline de la playlist')).toBeVisible();
        await expect(page.getByText('Glissez un média ici pour démarrer la playlist.')).toBeVisible();

        await page.getByRole('link', {name: 'Retour'}).click();
        await expect(page).toHaveURL(/\/dashboard\/playlists$/);

        await filterPlaylists(page, playlistName);
        await page.getByRole('button', {name: 'Ouvrir le menu'}).first().click();
        await Promise.all([
            page.waitForURL(new RegExp(`/dashboard/playlists/${playlistId}/edit(\\?.*)?$`)),
            page.getByRole('menuitem', {name: 'Modifier infos'}).click(),
        ]);
        await page.getByRole('link', {name: 'Annuler'}).click();
        await expect(page).toHaveURL(new RegExp(`/dashboard/playlists/${playlistId}(\\?.*)?$`));
    });

    test('create form supports cancel navigation', async ({page}) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
        await safeGoto(page, '/dashboard/playlists/new');
        await page.getByLabel('Nom').fill('Brouillon playlist');
        await page.getByLabel('Description').fill('Brouillon pour tester annulation.');
        await page.getByRole('link', {name: 'Annuler'}).click();
        await expect(page).toHaveURL(/\/dashboard\/playlists$/);
    });

    test('create, edit, and delete playlist flow', async ({page}, testInfo) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const playlistName = uniqueE2eName(testInfo.project.name, 'Playlist', 'Flow');
        const playlistId = await createPlaylist(page, {
            name: playlistName,
            description: 'Playlist à modifier et supprimer.',
        });
        createdPlaylistIds.add(playlistId);

        await page.getByRole('link', {name: 'Modifier infos'}).click();
        await expect(page).toHaveURL(new RegExp(`/dashboard/playlists/${playlistId}/edit$`));

        const updatedName = `${playlistName} Modifiée`;
        await page.getByLabel('Nom').fill(updatedName);
        await page.getByLabel('Description').fill('Description playlist mise à jour.');
        await page.getByRole('button', {name: 'Enregistrer'}).click();

        await expect(page).toHaveURL(new RegExp(`/dashboard/playlists/${playlistId}$`));
        await expect(page.getByRole('heading', {name: updatedName})).toBeVisible();
        await expect(page.getByText('Description playlist mise à jour.')).toBeVisible();

        await page.getByRole('button', {name: 'Supprimer'}).first().click();
        await confirmAlertDialog(page);
        await page.waitForURL(/\/dashboard\/playlists$/, {timeout: 15000});
        await expect(page.getByText('Playlist supprimée.')).toBeVisible();

        await filterPlaylists(page, updatedName);
        await expect(page.getByRole('link', {name: updatedName})).toHaveCount(0);
        createdPlaylistIds.clear();
    });
});
