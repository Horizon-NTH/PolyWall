import { expect, type Page } from '@playwright/test';

import { extractDashboardEntityId } from './data';
import { selectFieldOption } from './form';
import { confirmAlertDialog } from './ui';

export async function createChannel(
    page: Page,
    params: { name: string; description: string; templateName: string },
) {
    await page.goto('/dashboard/channels/new', {waitUntil: 'networkidle'});
    await page.getByLabel('Nom').fill(params.name);
    await page.getByLabel('Description').fill(params.description);
    await selectFieldOption(page, 'Modèle d\'affichage', params.templateName);

    const createButton = page.getByRole('main').getByRole('button', {name: 'Créer'});
    await expect(createButton).toBeEnabled();
    await createButton.click();

    await expect(page).toHaveURL((url) => /^\/dashboard\/channels\/[^/]+$/.test(url.pathname) &&
        url.pathname !== '/dashboard/channels/new');
    await expect(page.getByRole('heading', {name: params.name})).toBeVisible();
    return extractDashboardEntityId(page.url(), 'channels');
}

export async function deleteChannelById(page: Page, channelId: string) {
    await page.goto(`/dashboard/channels/${channelId}`);
    await page.getByRole('button', {name: 'Supprimer'}).click();
    await confirmAlertDialog(page);
    await expect(page.getByText('Canal supprimé.')).toBeVisible();
    await page.waitForURL(/\/dashboard\/channels$/);
}
