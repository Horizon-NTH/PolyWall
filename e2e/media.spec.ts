import { promises as fs } from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';

import {
    ADMIN_CREDENTIALS,
    DEMO_ORG_NAME,
    SUPER_ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';

function buildUniqueMediaTitle(projectName: string, suffix: string) {
    return `PW E2E ${projectName} Media ${Date.now()} ${suffix}`;
}

const createdMediaIds: string[] = [];

function trackMediaId(mediaItemId: string) {
    createdMediaIds.push(mediaItemId);
}

function extractMediaId(url: string) {
    const match = url.match(/\/dashboard\/media\/(?!new$)([^/]+)$/);
    if (!match) throw new Error(`Impossible de lire l'ID média depuis l'URL: ${url}`);
    return match[1];
}

async function ensureMediaList(page: Parameters<typeof login>[0]) {
    if (/\/dashboard\/media$/.test(page.url())) {
        await page.waitForLoadState('domcontentloaded');
        return;
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            await page.goto('/dashboard/media', {waitUntil: 'domcontentloaded'});
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

    await page.waitForURL(/\/dashboard\/media$/, {timeout: 15000});
}

async function filterMedia(page: Parameters<typeof login>[0], query: string) {
    await ensureMediaList(page);
    const search = page.getByPlaceholder('Rechercher un média...');
    await expect(search).toBeVisible();
    await search.fill(query);
    await expect(search).toHaveValue(query);
}

async function createMedia(
    page: Parameters<typeof login>[0],
    params: {
        title: string;
        description: string;
        filePath: string;
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
    await page.getByLabel('Fichier média').setInputFiles(params.filePath);
    await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();
    await page.waitForURL(
        (url) => /^\/dashboard\/media\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith('/new'),
        {timeout: 25000},
    );

    const mediaId = extractMediaId(page.url());
    await expect(page.getByRole('heading', {name: params.title})).toBeVisible();

    await page.unroute('**/api/media/upload-complete');
    await page.unroute('**/*');

    return mediaId;
}

async function deleteMediaById(page: Parameters<typeof login>[0], mediaId: string) {
    if (page.isClosed()) return;

    await page.goto(`/dashboard/media/${mediaId}`);
    const deleteButton = page.getByRole('button', {name: 'Supprimer'});
    if ((await deleteButton.count()) === 0) return;

    await deleteButton.click();
    const dialog = page.getByRole('alertdialog');
    await dialog.getByRole('button', {name: 'Supprimer'}).click();
    await page.waitForURL(/\/dashboard\/media$/, {timeout: 15000});
}

test.describe('media', () => {
    const uploadImagePath = path.join(
        process.cwd(),
        '.playwright',
        'fixtures',
        'media-upload-fixture.png',
    );
    const disallowedSvgPath = path.join(process.cwd(), 'public/logo.svg');
    const onePixelPngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3ZzVQAAAAASUVORK5CYII=';

    test.beforeAll(async () => {
        await fs.mkdir(path.dirname(uploadImagePath), {recursive: true});
        await fs.writeFile(uploadImagePath, Buffer.from(onePixelPngBase64, 'base64'));
    });

    test.beforeEach(async ({context}) => {
        await context.clearCookies();
        createdMediaIds.length = 0;
    });

    test.afterEach(async ({page}) => {
        if (createdMediaIds.length === 0) return;

        for (const mediaId of new Set(createdMediaIds)) {
            await deleteMediaById(page, mediaId);
        }
        createdMediaIds.length = 0;
    });

    test.afterAll(async () => {
        await fs.unlink(uploadImagePath).catch(() => undefined);
    });

    test('super admin must select an organization before accessing media page', async ({
                                                                                           page,
                                                                                       }) => {
        await login(
            page,
            SUPER_ADMIN_CREDENTIALS.email,
            SUPER_ADMIN_CREDENTIALS.password,
        );
        await page.goto('/dashboard/media');
        await expect(page).toHaveURL(/\/dashboard\/media$/);
        await expect(
            page.getByText('Sélectionnez une organisation pour accéder à cette page.'),
        ).toBeVisible();

        await page.getByTestId('organization-select-trigger').click();
        await page.getByRole('option', {name: DEMO_ORG_NAME}).click();
        await expect(page.getByRole('button', {name: 'Créer'})).toBeVisible();
    });

    test('list page supports search, filter controls, reset, and row actions', async ({
                                                                                          page,
                                                                                      }, testInfo) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const mediaTitle = buildUniqueMediaTitle(testInfo.project.name, 'List');
        const mediaId = await createMedia(page, {
            title: mediaTitle,
            description: 'Média e2e pour tester la liste.',
            filePath: uploadImagePath,
        });
        trackMediaId(mediaId);

        await ensureMediaList(page);
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

        await expect(page).toHaveURL(new RegExp(`/dashboard/media/${mediaId}$`));
        await expect(page.getByRole('heading', {name: mediaTitle})).toBeVisible();

        await page.getByRole('link', {name: 'Retour'}).click();
        await expect(page).toHaveURL(/\/dashboard\/media$/);

        await filterMedia(page, mediaTitle);
        await page.getByRole('button', {name: 'Ouvrir le menu'}).first().click();
        await Promise.all([
            page.waitForURL(new RegExp(`/dashboard/media/${mediaId}/edit$`)),
            page.getByRole('menuitem', {name: 'Modifier'}).click(),
        ]);
        await page.getByRole('link', {name: 'Annuler'}).click();
        await expect(page).toHaveURL(new RegExp(`/dashboard/media/${mediaId}$`));
    });

    test('create form validates required fields and rejects unsupported mime', async ({
                                                                                          page,
                                                                                      }, testInfo) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
        await page.goto('/dashboard/media/new');

        await page.getByLabel('Titre').fill(' ');
        await page.getByLabel('Description').fill(' ');
        await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();
        await expect(page.getByText('Le titre est requis.')).toBeVisible();
        await expect(page.getByText('La description est requise.')).toBeVisible();
        await expect(page.getByText('Le fichier est requis.')).toBeVisible();

        const mediaTitle = buildUniqueMediaTitle(testInfo.project.name, 'Mime');
        await page.getByLabel('Titre').fill(mediaTitle);
        await page.getByLabel('Description').fill('Tentative avec un format non autorisé.');
        await page.getByLabel('Fichier média').setInputFiles(disallowedSvgPath);
        await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();

        await expect(page.getByText('Type MIME non autorisé.')).toBeVisible();
        await expect(page).toHaveURL(/\/dashboard\/media\/new$/);
    });

    test('create, edit, toggle, and delete media flow', async ({page}, testInfo) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const mediaTitle = buildUniqueMediaTitle(testInfo.project.name, 'Flow');
        const mediaId = await createMedia(page, {
            title: mediaTitle,
            description: 'Média à modifier et supprimer.',
            filePath: uploadImagePath,
        });
        trackMediaId(mediaId);

        await page.getByRole('link', {name: 'Modifier'}).click();
        await expect(page).toHaveURL(new RegExp(`/dashboard/media/${mediaId}/edit$`));

        const updatedTitle = `${mediaTitle} Modifié`;
        await page.getByLabel('Titre').fill(updatedTitle);
        await page.getByLabel('Description').fill('Description média mise à jour.');
        await page.getByLabel('Média actif').click();
        await page.getByRole('button', {name: 'Enregistrer'}).click();

        await expect(page.getByText('Média mis à jour.')).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`/dashboard/media/${mediaId}$`));
        await expect(page.getByRole('heading', {name: updatedTitle})).toBeVisible();
        await expect(page.getByRole('button', {name: 'Activer'})).toBeVisible();

        await page.getByRole('button', {name: 'Activer'}).click();
        await expect(page.getByText('Média activé.')).toBeVisible();
        await expect(page.getByRole('button', {name: 'Désactiver'})).toBeVisible();

        await page.getByRole('button', {name: 'Supprimer'}).click();
        const dialog = page.getByRole('alertdialog');
        await dialog.getByRole('button', {name: 'Supprimer'}).click();
        await page.waitForURL(/\/dashboard\/media$/, {timeout: 15000});
        await expect(page.getByText('Média supprimé.')).toBeVisible();
        createdMediaIds.length = 0;
    });
});
