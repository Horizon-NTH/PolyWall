import { expect, type Page } from '@playwright/test';

export async function confirmAlertDialog(page: Page, buttonName = 'Supprimer') {
    const dialog = page.getByRole('alertdialog');
    await dialog.getByRole('button', {name: buttonName}).click();
}

export async function fillSearchByPlaceholder(page: Page, placeholder: string, query: string) {
    const search = page.getByPlaceholder(placeholder);
    await expect(search).toBeVisible();

    const modifierKey = process.platform === 'darwin' ? 'Meta' : 'Control';
    for (let attempt = 0; attempt < 3; attempt += 1) {
        await search.click();
        await search.fill(query);
        await page.waitForTimeout(50);
        if ((await search.inputValue()) === query) return;

        await search.press(`${modifierKey}+A`);
    }

    await expect(search).toHaveValue(query);
}

export async function expectCardToBeVisible(page: Page, text: string, exact: boolean = true) {
    await expect(page.locator('[data-slot="card-title"]').getByText(text, {exact})).toBeVisible();
}