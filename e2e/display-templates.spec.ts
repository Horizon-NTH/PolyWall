import { expect, test, type Page } from '@playwright/test';

import {
    ADMIN_CREDENTIALS,
    CONTENT_MANAGER_CREDENTIALS,
    SUPER_ADMIN_CREDENTIALS,
} from '@/test/fixtures/auth-test-credentials';
import { login } from './helpers/auth';
import { createChannel, deleteChannelById } from './helpers/channels';
import { createCleanupTracker, extractDashboardEntityId, uniqueE2eName } from './helpers/data';
import { confirmAlertDialog } from './helpers/ui';
import { fillNumberField, fillTextField, selectFieldOption } from './helpers/form';

function zoneCard(page: Page, zoneType: 'WIDGET' | 'STATIC' | 'PLAYLIST') {
    return page
        .locator('[data-slot="card"]')
        .filter({has: page.locator('[data-slot="card-description"]', {hasText: zoneType})})
        .last();
}

async function createDisplayTemplate(
    page: Page,
    params: {
        name: string;
        description: string;
        scope?: 'global' | 'organization';
        includeWidget?: boolean;
        includeStatic?: boolean;
        carousel?: {
            mediaBorderRadius: number;
            itemGap: number;
            sideDimOpacity: number;
        };
    },
) {
    await page.goto('/dashboard/display-templates/new');
    await expect(page.getByText('Nouveau modèle d\'affichage')).toBeVisible();

    if (params.scope) {
        await selectFieldOption(page, 'Portée', params.scope === 'global' ? 'Global' : 'Organisation');
    }

    if (params.carousel) {
        const playlistCard = zoneCard(page, 'PLAYLIST');
        await playlistCard.getByRole('tab', {name: 'Carousel'}).click();
        await fillNumberField(playlistCard, 'Arrondi médias', params.carousel.mediaBorderRadius);
        await fillNumberField(playlistCard, 'Espacement', params.carousel.itemGap);
        await fillNumberField(playlistCard, 'Assombrissement', params.carousel.sideDimOpacity);
    }

    if (params.includeWidget) {
        await page.getByRole('button', {name: /Zone widget/}).click();
        const widgetCard = zoneCard(page, 'WIDGET');
        await expect(widgetCard).toBeVisible();
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
        await expect(staticCard).toBeVisible();
        await fillTextField(staticCard, 'Nom', 'Bandeau info');
        await fillNumberField(staticCard, 'Position horizontale', 0);
        await fillNumberField(staticCard, 'Position verticale', 930);
        await fillNumberField(staticCard, 'Largeur', 1520);
        await fillNumberField(staticCard, 'Hauteur', 150);
        await staticCard.getByRole('tab', {name: 'Texte'}).click();
        await fillTextField(staticCard, 'Texte', 'Message institutionnel');
        await fillTextField(staticCard, 'Couleur texte', '#ffffff');
    }

    await page.getByRole('main').getByRole('textbox', {name: 'Nom'}).fill(params.name);
    await page.getByRole('main').getByRole('textbox', {name: 'Description'}).fill(params.description);
    await page.getByRole('main').getByRole('textbox', {name: 'Fond global'}).fill('#111827');

    await page.getByRole('main').getByRole('button', {name: 'Créer'}).click();
    await page.waitForURL(/\/dashboard\/display-templates\/[^/]+$/);
    await expect(page.getByRole('heading', {name: params.name})).toBeVisible();
    return extractDashboardEntityId(page.url(), 'display-templates');
}

async function deleteDisplayTemplateById(page: Page, templateId: string) {
    await page.goto(`/dashboard/display-templates/${templateId}`);
    await page.getByRole('button', {name: 'Supprimer'}).click();
    await confirmAlertDialog(page);
    await expect(page.getByText('Modèle supprimé.')).toBeVisible();
    await page.waitForURL(/\/dashboard\/display-templates$/);
}

test.describe('display templates', () => {
    test.describe.configure({mode: 'serial'});

    const createdTemplateIds = createCleanupTracker<string>();

    test.beforeEach(async ({context}) => {
        await context.clearCookies();
        createdTemplateIds.clear();
    });

    test.afterEach(async ({page}) => {
        for (const templateId of createdTemplateIds.unique()) {
            await deleteDisplayTemplateById(page, templateId);
        }

        createdTemplateIds.clear();
    });

    test('admin can create, edit, duplicate and delete an organization template with zones and a clock widget', async ({page}, testInfo) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const templateName = uniqueE2eName(testInfo.project.name, 'Template');
        const templateId = await createDisplayTemplate(page, {
            name: templateName,
            description: 'Modèle e2e avec une playlist, une horloge et un bandeau.',
            includeWidget: true,
            includeStatic: true,
        });
        createdTemplateIds.add(templateId);

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
        const originalPathname = `/dashboard/display-templates/${templateId}`;
        await page.waitForURL(url => url.pathname === originalPathname);
        await expect(page.getByText('Modèle mis à jour.')).toBeVisible();
        await expect(page.getByRole('heading', {name: updatedName})).toBeVisible();

        const duplicateName = `${updatedName} Copie`;
        await fillTextField(page.locator('[data-slot="card"]').filter({hasText: 'Actions'}), 'Nom de la copie', duplicateName);
        await page.getByRole('button', {name: 'Dupliquer'}).click();
        await page.waitForURL(url => url.pathname != originalPathname);
        const duplicateId = extractDashboardEntityId(page.url(), 'display-templates');
        await expect(page.getByRole('heading', {name: duplicateName})).toBeVisible();
        await expect(page.getByText('Modèle dupliqué.')).toBeVisible();

        await deleteDisplayTemplateById(page, duplicateId);
    });

    test('admin can create a carousel display template and keep its playlist options', async ({page}, testInfo) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const templateName = uniqueE2eName(testInfo.project.name, 'Template carousel');
        const templateId = await createDisplayTemplate(page, {
            name: templateName,
            description: 'Modèle e2e avec affichage carousel.',
            carousel: {
                mediaBorderRadius: 18,
                itemGap: 44,
                sideDimOpacity: 0.25,
            },
        });
        createdTemplateIds.add(templateId);

        await page.getByRole('link', {name: 'Modifier'}).click();
        await expect(page).toHaveURL(new RegExp(`/dashboard/display-templates/${templateId}/edit`));

        const playlistCard = zoneCard(page, 'PLAYLIST');
        await expect(playlistCard.getByRole('tab', {name: 'Carousel'})).toHaveAttribute('data-state', 'active');
        await expect(playlistCard.getByRole('spinbutton', {name: 'Arrondi médias'})).toHaveValue('18');
        await expect(playlistCard.getByRole('spinbutton', {name: 'Espacement'})).toHaveValue('44');
        await expect(playlistCard.getByRole('spinbutton', {name: 'Assombrissement'})).toHaveValue('0.25');

        await fillNumberField(playlistCard, 'Espacement', 52);
        await page.getByRole('main').getByRole('button', {name: 'Enregistrer'}).click();
        await page.waitForURL(new RegExp(`/dashboard/display-templates/${templateId}$`));

        await page.getByRole('link', {name: 'Modifier'}).click();
        const updatedPlaylistCard = zoneCard(page, 'PLAYLIST');
        await expect(updatedPlaylistCard.getByRole('spinbutton', {name: 'Espacement'})).toHaveValue('52');
    });

    test('template deletion is blocked when a channel uses it', async ({page}, testInfo) => {
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

        const templateName = uniqueE2eName(testInfo.project.name, 'Template utilisé');
        const templateId = await createDisplayTemplate(page, {
            name: templateName,
            description: 'Modèle e2e utilisé par un canal.',
            includeWidget: true,
        });
        createdTemplateIds.add(templateId);

        const channelName = uniqueE2eName(testInfo.project.name, 'Canal modèle');
        const channelId = await createChannel(page, {
            name: channelName,
            description: 'Canal e2e associé au modèle.',
            templateName,
        });

        await page.goto(`/dashboard/display-templates/${templateId}`);
        await expect(page.getByRole('link', {name: channelName})).toBeVisible();
        await page.getByRole('button', {name: 'Supprimer'}).click();

        const dialog = page.getByRole('alertdialog');
        await expect(dialog.getByText(/Suppression bloquée/)).toBeVisible();
        await expect(dialog.getByRole('button', {name: 'Supprimer'})).toHaveCount(0);
        await dialog.getByRole('button', {name: 'Fermer'}).click();

        await deleteChannelById(page, channelId);
    });

    test('content manager can read templates but cannot create or mutate them', async ({page}) => {
        await login(page, CONTENT_MANAGER_CREDENTIALS.email, CONTENT_MANAGER_CREDENTIALS.password);
        await page.goto('/dashboard/display-templates');

        await expect(page.getByText('Modèles d\'affichage').first()).toBeVisible();
        await expect(page.getByRole('link', {name: 'Créer'})).toHaveCount(0);

        await page.getByRole('link', {name: /Template Dashboard 16:9/}).first().click();
        await expect(page).toHaveURL(/\/dashboard\/display-templates\/[^/]+(\?.*)?$/);
        await expect(page.getByRole('link', {name: 'Modifier'})).toHaveCount(0);
        await expect(page.getByRole('button', {name: 'Supprimer'})).toHaveCount(0);

        await page.goto('/dashboard/display-templates/new');
        await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('platform super admin can create and manage a global template without selecting an organization', async ({page}, testInfo) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);

        const templateName = uniqueE2eName(testInfo.project.name, 'Global');
        const templateId = await createDisplayTemplate(page, {
            name: templateName,
            description: 'Modèle global e2e.',
            scope: 'global',
            includeWidget: true,
        });
        createdTemplateIds.add(templateId);

        await expect(page.getByText('Global', {exact: true})).toBeVisible();
        await expect(page.getByRole('link', {name: 'Modifier'})).toBeVisible();
        await expect(page.getByRole('button', {name: 'Supprimer'})).toBeVisible();

        await page.getByRole('link', {name: 'Retour'}).click();

        await page.getByRole('button', {name: 'Portée'}).first().click();
        await page.getByRole('menuitemradio', {name: 'Globales'}).click();
        await expect(page.getByRole('link', {name: templateName})).toBeVisible();
    });

    test('organization admin can read a global template but cannot edit it', async ({page}, testInfo) => {
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);

        const templateName = uniqueE2eName(testInfo.project.name, 'Global lecture');
        const templateId = await createDisplayTemplate(page, {
            name: templateName,
            description: 'Modèle global lu par une organisation.',
            scope: 'global',
        });
        createdTemplateIds.add(templateId);

        await page.context().clearCookies();
        await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
        await page.goto(`/dashboard/display-templates/${templateId}`);
        await expect(page).toHaveURL((url) => url.pathname === `/dashboard/display-templates/${templateId}`);
        await expect(
            page.getByRole('main').locator('[data-slot="card"]').filter({hasText: 'Informations'})
                .getByText('Global', {exact: true}).first(),
        ).toBeVisible();
        await expect(page.getByRole('link', {name: 'Modifier'})).toHaveCount(0);
        await page.goto(`/dashboard/display-templates/${templateId}/edit`);
        await expect(page).toHaveURL(/\/dashboard$/);

        await page.context().clearCookies();
        await login(page, SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);
    });
});
