function slugifyDisplayTemplateName(name: string) {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 64) || 'modele';
}

export function createDisplayTemplateKey(organizationId: string | null, name: string) {
    const slug = slugifyDisplayTemplateName(name);
    return organizationId ? `org:${organizationId}:${slug}` : `global:${slug}`;
}
