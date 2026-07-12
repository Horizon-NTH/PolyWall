import path from 'path';
import { expect, Page, test } from '@playwright/test';

import {
    ADMIN_CREDENTIALS,
    DEMO_ORG_NAME,
    SUPER_ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';
import { createCleanupTracker, extractDashboardEntityId, uniqueE2eName } from './helpers/data';
import { confirmAlertDialog } from './helpers/ui';

const createdMediaIds = createCleanupTracker<string>();

async function filterMedia(page: Page, query: string) {
    const search = page.getByPlaceholder('Rechercher un média...');
    await search.click();
    await search.fill(query);
}

async function createMedia(
    page: Page,
    params: {
        title: string;
        description: string;
        file: string | { name: string; mimeType: string; buffer: Buffer };
        durationSeconds?: string;
    },
) {
    await page.route('**/*', async (route) => {
        if (route.request().method() === 'PUT') {
            await route.fulfill({status: 200, body: ''});
            return;
        }
        await route.continue();
    });

    await page.route('**/api/media/upload-complete', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ok: true}),
        });
    });

    await page.goto('/dashboard/media/new');
    await page.getByLabel('Titre').fill(params.title);
    await page.getByLabel('Description').fill(params.description);
    if (params.durationSeconds) {
        await page.getByLabel('Durée (secondes)').fill(params.durationSeconds);
    }
    await page.getByLabel('Fichier média').setInputFiles(params.file);
    await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();
    await page.waitForURL(url => /^\/dashboard\/media\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith('/new'));

    const mediaId = extractDashboardEntityId(page.url(), 'media');
    await expect(page.getByRole('heading', {name: params.title})).toBeVisible();

    await page.unroute('**/api/media/upload-complete');
    await page.unroute('**/*');

    return mediaId;
}

async function deleteMediaById(page: Page, mediaId: string) {
    await page.goto(`/dashboard/media/${mediaId}`);
    await page.getByRole('button', {name: 'Supprimer'}).click();
    await confirmAlertDialog(page);
    await page.waitForURL(/\/dashboard\/media$/);
}

test.describe('media', () => {
    const disallowedSvgPath = path.join(process.cwd(), 'public/logo.svg');
    const uploadImageFile = {
        name: 'media-upload-fixture.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3ZzVQAAAAASUVORK5CYII=',
            'base64',
        ),
    } as const;

    test.beforeEach(async ({context}) => {
        await context.clearCookies();
        createdMediaIds.clear();
    });

    test.afterEach(async ({page}) => {
        if (createdMediaIds.isEmpty) return;

        for (const mediaId of createdMediaIds.unique()) {
            await deleteMediaById(page, mediaId);
        }
        createdMediaIds.clear();
    });

    test('super admin must select an organization before accessing media page', async ({page}) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);

        await page.goto('/dashboard/media');
        await expect(page).toHaveURL(/\/dashboard\/media$/);
        await expect(
            page.getByText('Sélectionnez une organisation pour accéder à cette page.'),
        ).toBeVisible();

        await page.getByTestId('organization-select-trigger').click();
        await page.getByRole('option', {name: DEMO_ORG_NAME}).click();
        await expect(page.getByPlaceholder('Rechercher un média...')).toBeVisible();
    });

    test('list page supports search, filter controls, reset, and row actions', async ({page}, testInfo) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const mediaTitle = uniqueE2eName(testInfo.project.name, 'Media', 'List');
        const mediaId = await createMedia(page, {
            title: mediaTitle,
            description: 'Média e2e pour tester la liste.',
            file: uploadImageFile,
        });
        createdMediaIds.add(mediaId);

        await page.getByRole('link', {name: 'Retour'}).click();

        await filterMedia(page, mediaTitle);
        await expect(
            page.getByRole('main').locator('[data-slot="card-title"]', {hasText: mediaTitle}),
        ).toBeVisible();

        await expect(page.getByRole('main').locator('[data-slot="select-trigger"]')).toHaveCount(4);
        await expect(page.getByRole('main').locator('[data-slot="select-trigger"]', {hasText: 'MAJ récentes'})).toBeVisible();
        await expect(page.getByRole('main').locator('[data-slot="select-trigger"]', {hasText: 'Tous les types'})).toBeVisible();
        await expect(page.getByRole('main').locator('[data-slot="select-trigger"]', {hasText: 'Tous les statuts'})).toBeVisible();
        await expect(
            page.getByRole('main').locator('[data-slot="select-trigger"]').filter({hasText: /^Tous$/}),
        ).toBeVisible();

        await page.getByRole('button', {name: 'Réinitialiser'}).click();
        await expect(page.getByPlaceholder('Rechercher un média...')).toHaveValue('');

        await filterMedia(page, mediaTitle);
        await page.getByRole('button', {name: 'Ouvrir le menu'}).first().click();
        await expect(page.getByRole('menuitem', {name: 'Voir la fiche'})).toBeVisible();
        await expect(page.getByRole('menuitem', {name: 'Modifier'})).toBeVisible();
        await expect(page.getByRole('menuitem', {name: 'Désactiver'})).toBeVisible();
        await expect(page.getByRole('menuitem', {name: 'Supprimer'})).toBeVisible();
        await page.getByRole('menuitem', {name: 'Voir la fiche'}).click();

        await expect(page).toHaveURL(new RegExp(`/dashboard/media/${mediaId}(\\?.*)?$`));
        await expect(page.getByRole('heading', {name: mediaTitle})).toBeVisible();

        await page.getByRole('link', {name: 'Retour'}).click();
        await expect(page).toHaveURL(/\/dashboard\/media$/);

        await filterMedia(page, mediaTitle);
        await page.getByRole('button', {name: 'Ouvrir le menu'}).first().click();
        await page.getByRole('menuitem', {name: 'Modifier'}).click();
        await expect(page).toHaveURL((url) => url.pathname === `/dashboard/media/${mediaId}/edit`);
        await page.getByRole('link', {name: 'Annuler'}).click();
        await expect(page).toHaveURL((url) => url.pathname === `/dashboard/media/${mediaId}`);
    });

    test('create form validates required fields and rejects unsupported mime', async ({page}, testInfo) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
        await page.goto('/dashboard/media/new');

        await page.getByLabel('Titre').fill(' ');
        await page.getByLabel('Description').fill(' ');
        await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();
        await expect(page.getByText('Le titre est requis.')).toBeVisible();
        await expect(page.getByText('La description est requise.')).toBeVisible();
        await expect(page.getByText('Le fichier est requis.')).toBeVisible();

        const mediaTitle = uniqueE2eName(testInfo.project.name, 'Media', 'Mime');
        await page.getByLabel('Titre').fill(mediaTitle);
        await page.getByLabel('Description').fill('Tentative avec un format non autorisé.');
        await page.getByLabel('Fichier média').setInputFiles(disallowedSvgPath);
        await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();

        await expect(page.getByText('Type MIME non autorisé.')).toBeVisible();
        await expect(page).toHaveURL(/\/dashboard\/media\/new$/);
    });

    test('create, edit, toggle, and delete media flow', async ({page}, testInfo) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const mediaTitle = uniqueE2eName(testInfo.project.name, 'Media', 'Flow');
        const mediaId = await createMedia(page, {
            title: mediaTitle,
            description: 'Média à modifier et supprimer.',
            file: uploadImageFile,
        });
        createdMediaIds.add(mediaId);

        await page.getByRole('link', {name: 'Modifier'}).click();
        await expect(page).toHaveURL((url) => url.pathname === `/dashboard/media/${mediaId}/edit`);

        const updatedTitle = `${mediaTitle} Modifié`;
        await page.getByLabel('Titre').fill(updatedTitle);
        await page.getByLabel('Description').fill('Description média mise à jour.');
        await page.getByLabel('Média actif').click();
        await page.getByRole('button', {name: 'Enregistrer'}).click();

        await expect(page.getByText('Média mis à jour.')).toBeVisible();
        await expect(page).toHaveURL((url) => url.pathname === `/dashboard/media/${mediaId}`);
        await expect(page.getByRole('heading', {name: updatedTitle})).toBeVisible();
        await expect(page.getByRole('button', {name: 'Activer'})).toBeVisible();

        await page.getByRole('button', {name: 'Activer'}).click();
        await expect(page.getByText('Média activé.')).toBeVisible();
        await expect(page.getByRole('button', {name: 'Désactiver'})).toBeVisible();

        await page.getByRole('button', {name: 'Supprimer'}).click();
        await confirmAlertDialog(page);
        await page.waitForURL(/\/dashboard\/media$/, {timeout: 15000});
        await expect(page.getByText('Média supprimé.')).toBeVisible();
        createdMediaIds.clear();
    });
});
