import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DisplayTemplateForm } from '@/components/display-templates/display-template-form';
import { ZoneType } from '@/generated/prisma/enums';
import { type DisplayTemplateCreateValues } from '@/schemas/display-template-schema';

const pushMock = vi.fn();
const createDisplayTemplateMock = vi.fn();
const updateDisplayTemplateMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: pushMock,
    }),
}));

vi.mock('@/actions/display-template-actions', () => ({
    createDisplayTemplate: (...args: unknown[]) => createDisplayTemplateMock(...args),
    updateDisplayTemplate: (...args: unknown[]) => updateDisplayTemplateMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
        error: vi.fn(),
    },
}));

vi.mock('@/components/ui/select', () => ({
    Select: ({children, value, onValueChange, disabled}: {
        children: ReactNode;
        value?: string;
        onValueChange?: (value: string) => void;
        disabled?: boolean;
    }) => (
        <select
            data-testid="mock-select"
            value={value}
            disabled={disabled}
            onChange={(event) => onValueChange?.(event.target.value)}
        >
            {children}
        </select>
    ),
    SelectTrigger: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectValue: ({placeholder}: { placeholder?: string }) => <option value="">{placeholder}</option>,
    SelectContent: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectGroup: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({value, children, disabled}: { value: string; children: ReactNode; disabled?: boolean }) => (
        <option value={value} disabled={disabled}>{children}</option>
    ),
}));

vi.mock('@/components/ui/tabs', () => ({
    Tabs: ({children}: { children: ReactNode }) => <div>{children}</div>,
    TabsList: ({children}: { children: ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({children, value}: { children: ReactNode; value: string }) => (
        <button type="button" role="tab" data-value={value}>{children}</button>
    ),
    TabsContent: ({children}: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tooltip', () => ({
    Tooltip: ({children}: { children: ReactNode }) => <>{children}</>,
    TooltipTrigger: ({children}: { children: ReactNode }) => <>{children}</>,
    TooltipContent: ({children}: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));

describe('DisplayTemplateForm', () => {
    const widgetTypes = [
        {id: 'widget-clock', name: 'Horloge', technicalKey: 'clock'},
        {id: 'widget-rss', name: 'Flux RSS', technicalKey: 'rss'},
    ];

    beforeEach(() => {
        pushMock.mockReset();
        createDisplayTemplateMock.mockReset();
        updateDisplayTemplateMock.mockReset();
        toastSuccessMock.mockReset();
    });

    it('creates a global template and redirects on success', async () => {
        createDisplayTemplateMock.mockResolvedValueOnce({ok: true, templateId: 'template-global'});

        render(
            <DisplayTemplateForm
                mode="create"
                widgetTypes={widgetTypes}
                cancelHref="/dashboard/display-templates"
                canCreateGlobalTemplates
                canCreateOrganizationTemplates={false}
                defaultScope="global"
            />,
        );

        fireEvent.change(screen.getByLabelText('Nom'), {target: {value: 'Template global'}});
        fireEvent.change(screen.getByLabelText('Description'), {target: {value: 'Modèle global'}} );
        fireEvent.click(screen.getByRole('button', {name: 'Créer'}));

        await waitFor(() => {
            expect(createDisplayTemplateMock).toHaveBeenCalledWith(expect.objectContaining({
                scope: 'global',
                name: 'Template global',
                description: 'Modèle global',
                resolutionX: 1920,
                resolutionY: 1080,
            }));
            expect(toastSuccessMock).toHaveBeenCalledWith('Modèle créé.');
            expect(pushMock).toHaveBeenCalledWith('/dashboard/display-templates/template-global');
        });
    });

    it('adds a widget zone with one widget instance in the submitted payload', async () => {
        createDisplayTemplateMock.mockResolvedValueOnce({ok: true, templateId: 'template-widget'});

        render(
            <DisplayTemplateForm
                mode="create"
                widgetTypes={widgetTypes}
                cancelHref="/dashboard/display-templates"
            />,
        );

        fireEvent.change(screen.getByLabelText('Nom'), {target: {value: 'Template widget'}});
        fireEvent.change(screen.getByLabelText('Description'), {target: {value: 'Modèle avec widget'}});
        fireEvent.click(screen.getByRole('button', {name: /Zone widget/}));
        fireEvent.click(screen.getByRole('button', {name: 'Créer'}));

        await waitFor(() => {
            const payload = createDisplayTemplateMock.mock.calls[0]?.[0] as DisplayTemplateCreateValues;
            expect(payload.zones).toHaveLength(2);
            expect(payload.zones.filter((zone) => zone.zoneType === ZoneType.PLAYLIST)).toHaveLength(1);
            expect(payload.zones.filter((zone) => zone.zoneType === ZoneType.WIDGET)).toHaveLength(1);
            expect(payload.zones.find((zone) => zone.zoneType === ZoneType.WIDGET)?.widgetInstance)
                .toEqual(expect.objectContaining({
                    widgetTypeId: 'widget-clock',
                    active: true,
                    refreshPeriodSeconds: 30,
                }));
        });
    });

    it('updates an existing template without exposing scope changes', async () => {
        updateDisplayTemplateMock.mockResolvedValueOnce({ok: true, templateId: 'template-1'});

        render(
            <DisplayTemplateForm
                mode="edit"
                templateId="template-1"
                widgetTypes={widgetTypes}
                cancelHref="/dashboard/display-templates/template-1"
                canCreateGlobalTemplates
                defaultValues={{
                    scope: 'organization',
                    name: 'Template existant',
                    description: 'Description existante',
                    resolutionX: 1920,
                    resolutionY: 1080,
                    configurationJson: {backgroundColor: '#000000'},
                    zones: [{
                        id: 'zone-1',
                        name: 'Playlist',
                        zoneType: ZoneType.PLAYLIST,
                        orderIndex: 0,
                        positionX: 0,
                        positionY: 0,
                        width: 1920,
                        height: 1080,
                        configurationJson: {},
                        widgetInstance: null,
                    }],
                }}
            />,
        );

        expect(screen.queryByText('Portée')).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Nom'), {target: {value: 'Template modifié'}});
        fireEvent.click(screen.getByRole('button', {name: 'Enregistrer'}));

        await waitFor(() => {
            expect(updateDisplayTemplateMock).toHaveBeenCalledWith(
                'template-1',
                expect.objectContaining({
                    name: 'Template modifié',
                    description: 'Description existante',
                }),
            );
            expect(toastSuccessMock).toHaveBeenCalledWith('Modèle mis à jour.');
            expect(pushMock).toHaveBeenCalledWith('/dashboard/display-templates/template-1');
        });
    });
});
