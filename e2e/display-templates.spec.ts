import { expect, test, type Locator, type Page } from '@playwright/test';

import {
    ADMIN_CREDENTIALS,
    CONTENT_MANAGER_CREDENTIALS,
    SUPER_ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';
import { safeGoto } from './helpers/navigation';

function buildUniqueName(projectName: string, subject: string) {
    return `PW E2E ${projectName} ${subject} ${Date.now()}`;
}

function extractEntityId(url: string, resource: 'channels' | 'display-templates') {
    const match = url.match(new RegExp(`/dashboard/${resource}/(?!new$)(?!.*\\/edit$)([^/?#]+)`));
    if (!match) throw new Error(`Impossible de lire l'ID depuis l'URL: ${url}`);
    return match[1];
}

async function fieldByLabel(container: Page | Locator, label: string) {
    const fields = await container.locator('[data-slot="field"]').all();

    for (const field of fields) {
        const directLabel = field.locator(':scope > [data-slot="field-label"]').first();
        if ((await directLabel.count()) === 0) continue;

        const labelText = ((await directLabel.textContent()) ?? '').replace(/\s+/g, ' ').trim();
        if (labelText === label) return field;
    }

    throw new Error(`Champ introuvable: ${label}`);
}

function zoneCard(page: Page, zoneType: 'WIDGET' | 'STATIC' | 'PLAYLIST') {
    return page
        .locator('[data-slot="card"]')
        .filter({has: page.locator('[data-slot="card-description"]', {hasText: zoneType})})
        .last();
}

function getPage(container: Page | Locator) {
    return 'page' in container ? container.page() : container;
}

async function fillTextField(container: Page | Locator, label: string, value: string) {
    await (await fieldByLabel(container, label)).getByRole('textbox').fill(value);
}

async function fillNumberField(container: Page | Locator, label: string, value: number) {
    await (await fieldByLabel(container, label)).getByRole('spinbutton').fill(String(value));
}

async function selectFieldOption(container: Page | Locator, label: string, optionName: string | RegExp) {
    await (await fieldByLabel(container, label)).getByRole('combobox').click();
    await getPage(container)
        .getByRole('option', typeof optionName === 'string' ? {name: optionName, exact: true} : {name: optionName})
        .click();
}

async function ensureTemplatesList(page: Page) {
    await safeGoto(page, '/dashboard/display-templates');
    await page.waitForURL(/\/dashboard\/display-templates$/, {timeout: 15000});
    await page.waitForLoadState('domcontentloaded');
}

async function findTemplateIdFromList(page: Page, name: string) {
    await ensureTemplatesList(page);
    const link = page.getByRole('link', {name});
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    if (!href) throw new Error(`Lien du modèle introuvable: ${name}`);
    return extractEntityId(href, 'display-templates');
}

async function createDisplayTemplate(
    page: Page,
    params: {
        name: string;
        description: string;
        scope?: 'global' | 'organization';
        includeWidget?: boolean;
        includeStatic?: boolean;
    },
) {
    await safeGoto(page, '/dashboard/display-templates/new');
    await expect(page.getByText('Nouveau modèle d\'affichage')).toBeVisible();

    if (params.scope) {
        await selectFieldOption(page, 'Portée', params.scope === 'global' ? 'Global' : 'Organisation');
    }

    await page.getByRole('main').getByRole('textbox', {name: 'Nom'}).fill(params.name);
    await page.getByRole('main').getByRole('textbox', {name: 'Description'}).fill(params.description);
    await page.getByRole('main').getByRole('textbox', {name: 'Fond global'}).fill('#111827');

    if (params.includeWidget) {
        await page.getByRole('button', {name: /Zone widget/}).click();
        const widgetCard = zoneCard(page, 'WIDGET');
        await fillTextField(widgetCard, 'Nom', 'Horloge latérale');
        await fillNumberField(widgetCard, 'Position horizontale', 1520);
        await fillNumberField(widgetCard, 'Position verticale', 0);
        await fillNumberField(widgetCard, 'Largeur', 400);
        await fillNumberField(widgetCard, 'Hauteur', 1080);
        await widgetCard.getByRole('tab', {name: 'Horloge'}).click();
        await fillTextField(widgetCard, 'Timezone', 'Europe/Paris');
        await selectFieldOption(widgetCard, 'Format', 'HH:mm:ss');
    }

    if (params.includeStatic) {
        await page.getByRole('button', {name: /Zone statique/}).click();
        const staticCard = zoneCard(page, 'STATIC');
        await fillTextField(staticCard, 'Nom', 'Bandeau info');
        await fillNumberField(staticCard, 'Position horizontale', 0);
        await fillNumberField(staticCard, 'Position verticale', 930);
        await fillNumberField(staticCard, 'Largeur', 1520);
        await fillNumberField(staticCard, 'Hauteur', 150);
        await staticCard.getByRole('tab', {name: 'Texte'}).click();
        await fillTextField(staticCard, 'Texte', 'Message institutionnel');
        await fillTextField(staticCard, 'Couleur texte', '#ffffff');
        await fillTextField(staticCard, 'Fond', '#0f172a');
    }

    await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();
    await page.waitForURL(/\/dashboard\/display-templates\/[^/]+$/, {timeout: 15000});
    await expect(page.getByRole('heading', {name: params.name})).toBeVisible();
    return extractEntityId(page.url(), 'display-templates');
}

async function deleteDisplayTemplateById(page: Page, templateId: string) {
    if (page.isClosed()) return;

    await safeGoto(page, `/dashboard/display-templates/${templateId}`);
    if (!new RegExp(`/dashboard/display-templates/${templateId}$`).test(new URL(page.url()).pathname)) return;

    const deleteButton = page.getByRole('button', {name: 'Supprimer'}).first();
    if ((await deleteButton.count()) === 0) return;

    await deleteButton.click();
    const dialog = page.getByRole('alertdialog');
    if ((await dialog.getByRole('button', {name: 'Supprimer'}).count()) === 0) return;
    await dialog.getByRole('button', {name: 'Supprimer'}).click();
    await page.waitForURL(/\/dashboard\/display-templates$/, {timeout: 15000});
}

async function deleteChannelById(page: Page, channelId: string) {
    if (page.isClosed()) return;

    await safeGoto(page, `/dashboard/channels/${channelId}`);
    if (!new RegExp(`/dashboard/channels/${channelId}$`).test(new URL(page.url()).pathname)) return;

    const deleteButton = page.getByRole('button', {name: 'Supprimer'}).first();
    if ((await deleteButton.count()) === 0) return;

    await deleteButton.click();
    const dialog = page.getByRole('alertdialog');
    await dialog.getByRole('button', {name: 'Supprimer'}).click();
    await page.waitForURL(/\/dashboard\/channels$/, {timeout: 15000});
}

async function createChannelWithTemplate(
    page: Page,
    params: {
        name: string;
        description: string;
        templateName: string;
    },
) {
    await safeGoto(page, '/dashboard/channels/new');
    await page.getByRole('main').getByRole('textbox', {name: 'Nom'}).fill(params.name);
    await page.getByRole('main').getByRole('textbox', {name: 'Description'}).fill(params.description);
    await selectFieldOption(page, 'Modèle d\'affichage', params.templateName);
    await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();
    await page.waitForURL(/\/dashboard\/channels\/[^/]+$/, {timeout: 15000});
    await expect(page.getByRole('heading', {name: params.name})).toBeVisible();
    return extractEntityId(page.url(), 'channels');
}

test.describe('display templates', () => {
    test.describe.configure({mode: 'serial'});

    const createdTemplateIds: string[] = [];
    const createdChannelIds: string[] = [];

    test.beforeEach(async ({context}) => {
        await context.clearCookies();
        createdTemplateIds.length = 0;
        createdChannelIds.length = 0;
    });

    test.afterEach(async ({page}) => {
        for (const channelId of new Set(createdChannelIds)) {
            await deleteChannelById(page, channelId);
        }

        for (const templateId of new Set(createdTemplateIds).values()) {
            await deleteDisplayTemplateById(page, templateId);
        }

        createdChannelIds.length = 0;
        createdTemplateIds.length = 0;
    });

    test('admin can create, edit, duplicate and delete an organization template with zones and a clock widget', async ({page}, testInfo) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const templateName = buildUniqueName(testInfo.project.name, 'Template');
        const templateId = await createDisplayTemplate(page, {
            name: templateName,
            description: 'Modèle e2e avec une playlist, une horloge et un bandeau.',
            includeWidget: true,
            includeStatic: true,
        });
        createdTemplateIds.push(templateId);

        const main = page.getByRole('main');
        await expect(main.getByText('Organisation', {exact: true})).toBeVisible();
        await expect(main.getByText('1920x1080')).toBeVisible();
        await expect(main.getByText('Horloge latérale')).toBeVisible();
        await expect(main.getByText('Bandeau info')).toBeVisible();
        await expect(main.locator('[data-slot="card"]').filter({hasText: 'Informations'}).getByText('3', {exact: true}))
            .toBeVisible();

        await page.getByRole('link', {name: 'Modifier'}).click();
        await expect(page).toHaveURL(new RegExp(`/dashboard/display-templates/${templateId}/edit`));

        const updatedName = `${templateName} Modifié`;
        await page.getByRole('main').getByRole('textbox', {name: 'Nom'}).fill(updatedName);
        await page.getByRole('main').getByRole('textbox', {name: 'Description'}).fill('Description mise à jour par le test e2e.');

        const widgetCard = zoneCard(page, 'WIDGET');
        await selectFieldOption(widgetCard, 'Format', 'HH:mm');

        await page.getByRole('main').getByRole('button', {name: 'Enregistrer'}).click();
        await page.waitForURL(new RegExp(`/dashboard/display-templates/${templateId}$`), {timeout: 15000});
        await expect(page.getByText('Modèle mis à jour.')).toBeVisible();
        await expect(page.getByRole('heading', {name: updatedName})).toBeVisible();

        const duplicateName = `${updatedName} Copie`;
        await fillTextField(page.locator('[data-slot="card"]').filter({hasText: 'Actions'}), 'Nom de la copie', duplicateName);
        await page.getByRole('button', {name: 'Dupliquer'}).click();
        await expect.poll(() => {
            const url = new URL(page.url());
            const duplicateIdFromUrl = url.pathname.match(/^\/dashboard\/display-templates\/([^/]+)$/)?.[1];
            return duplicateIdFromUrl && duplicateIdFromUrl !== templateId ? duplicateIdFromUrl : null;
        }, {timeout: 15000}).not.toBeNull();
        const duplicateId = extractEntityId(page.url(), 'display-templates');
        createdTemplateIds.push(duplicateId);
        await expect(page.getByRole('heading', {name: duplicateName})).toBeVisible();
        await expect(page.getByText('Modèle dupliqué.')).toBeVisible();

        await deleteDisplayTemplateById(page, duplicateId);
        createdTemplateIds.splice(createdTemplateIds.indexOf(duplicateId), 1);
        await expect(page.getByText('Modèle supprimé.')).toBeVisible();

        await deleteDisplayTemplateById(page, templateId);
        createdTemplateIds.splice(createdTemplateIds.indexOf(templateId), 1);
        await expect(page.getByText('Modèle supprimé.')).toBeVisible();
    });

    test('template deletion is blocked when a channel uses it', async ({page}, testInfo) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const templateName = buildUniqueName(testInfo.project.name, 'Template utilisé');
        const templateId = await createDisplayTemplate(page, {
            name: templateName,
            description: 'Modèle e2e utilisé par un canal.',
            includeWidget: true,
        });
        createdTemplateIds.push(templateId);

        const channelName = buildUniqueName(testInfo.project.name, 'Canal modèle');
        const channelId = await createChannelWithTemplate(page, {
            name: channelName,
            description: 'Canal e2e associé au modèle.',
            templateName,
        });
        createdChannelIds.push(channelId);

        await safeGoto(page, `/dashboard/display-templates/${templateId}`);
        await expect(page.getByRole('link', {name: channelName})).toBeVisible();
        await page.getByRole('button', {name: 'Supprimer'}).click();

        const dialog = page.getByRole('alertdialog');
        await expect(dialog.getByText(/Suppression bloquée/)).toBeVisible();
        await expect(dialog.getByRole('button', {name: 'Supprimer'})).toHaveCount(0);
        await dialog.getByRole('button', {name: 'Fermer'}).click();

        await deleteChannelById(page, channelId);
        createdChannelIds.splice(createdChannelIds.indexOf(channelId), 1);
    });

    test('content manager can read templates but cannot create or mutate them', async ({page}) => {
        await login(page, CONTENT_MANAGER_CREDENTIALS.email, CONTENT_MANAGER_CREDENTIALS.password);
        await ensureTemplatesList(page);

        await expect(page.getByText('Modèles d\'affichage').first()).toBeVisible();
        await expect(page.getByRole('link', {name: 'Créer'})).toHaveCount(0);

        await page.getByRole('link', {name: /Template Dashboard 16:9/}).first().click();
        await expect(page).toHaveURL(/\/dashboard\/display-templates\/[^/]+(\?.*)?$/);
        await expect(page.getByRole('link', {name: 'Modifier'})).toHaveCount(0);
        await expect(page.getByRole('button', {name: 'Supprimer'})).toHaveCount(0);

        await safeGoto(page, '/dashboard/display-templates/new');
        await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('platform super admin can create and manage a global template without selecting an organization', async ({page}, testInfo) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);

        const templateName = buildUniqueName(testInfo.project.name, 'Global');
        const templateId = await createDisplayTemplate(page, {
            name: templateName,
            description: 'Modèle global e2e.',
            scope: 'global',
            includeWidget: true,
        });
        createdTemplateIds.push(templateId);

        await expect(page.getByText('Global', {exact: true})).toBeVisible();
        await expect(page.getByRole('link', {name: 'Modifier'})).toBeVisible();
        await expect(page.getByRole('button', {name: 'Supprimer'})).toBeVisible();

        await ensureTemplatesList(page);
        await page.getByRole('button', {name: 'Portée'}).first().click();
        await page.getByRole('menuitemradio', {name: 'Globales'}).click();
        await expect(page.getByRole('link', {name: templateName})).toBeVisible();
    });

    test('organization admin can read a global template but cannot edit it', async ({page}, testInfo) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);

        const templateName = buildUniqueName(testInfo.project.name, 'Global lecture');
        const templateId = await createDisplayTemplate(page, {
            name: templateName,
            description: 'Modèle global lu par une organisation.',
            scope: 'global',
        });
        createdTemplateIds.push(templateId);

        await page.context().clearCookies();
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const listedTemplateId = await findTemplateIdFromList(page, templateName);
        expect(listedTemplateId).toBe(templateId);

        await page.getByRole('link', {name: templateName}).click();
        await expect(
            page.getByRole('main').locator('[data-slot="card"]').filter({hasText: 'Informations'})
                .getByText('Global', {exact: true}).first(),
        ).toBeVisible();
        await expect(page.getByRole('link', {name: 'Modifier'})).toHaveCount(0);
        await safeGoto(page, `/dashboard/display-templates/${templateId}/edit`);
        await expect(page).toHaveURL(/\/dashboard$/);

        await page.context().clearCookies();
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);
    });
});
