import type { Locator, Page } from '@playwright/test';

export async function fieldByLabel(container: Page | Locator, label: string) {
    const fields = await container.locator('[data-slot="field"]').all();

    for (const field of fields) {
        const directLabel = field.locator(
            ':scope > [data-slot="field-label"], :scope > label, :scope > div > label',
        ).first();
        if ((await directLabel.count()) === 0) continue;

        const labelText = ((await directLabel.textContent()) ?? '').replace(/\s+/g, ' ').trim();
        if (labelText === label) return field;
    }

    throw new Error(`Champ introuvable: ${label}`);
}

export async function fillTextField(container: Page | Locator, label: string, value: string) {
    await (await fieldByLabel(container, label)).getByRole('textbox').fill(value);
}

export async function fillNumberField(container: Page | Locator, label: string, value: number) {
    await (await fieldByLabel(container, label)).getByRole('spinbutton').fill(String(value));
}


function getPage(container: Page | Locator) {
    return 'page' in container ? container.page() : container;
}

export async function selectFieldOption(container: Page | Locator, label: string, optionName: string | RegExp) {
    const combobox = (await fieldByLabel(container, label)).getByRole('combobox').first();
    await combobox.click();
    await getPage(container)
        .getByRole('option', typeof optionName === 'string' ? {name: optionName, exact: true} : {name: optionName})
        .click();
}
