import React, { type ReactNode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ZoneConfigurationEditor } from '@/components/display-templates/display-template-zone-configuration-editor';
import { ZoneType } from '@/generated/prisma/enums';

vi.mock('@/components/ui/select', () => ({
    Select: ({children, value, onValueChange}: {
        children: ReactNode;
        value?: string;
        onValueChange?: (value: string) => void;
    }) => {
        const options: ReactNode[] = [];

        function collectOptions(node: ReactNode): void {
            if (Array.isArray(node)) {
                node.forEach(collectOptions);
                return;
            }

            if (!React.isValidElement<{
                children?: ReactNode;
                media?: {id: string; title: string};
                value?: string;
                textValue?: string;
            }>(node)) return;

            const elementName = typeof node.type === 'function' ? node.type.name : '';
            if (node.props.media && elementName === 'StaticImageMediaSelectItem') {
                options.push(<option key={node.props.media.id} value={node.props.media.id}>{node.props.media.title}</option>);
                return;
            }

            if (node.props.value) {
                options.push(<option key={node.props.value} value={node.props.value}>{node.props.textValue ?? node.props.children}</option>);
                return;
            }

            collectOptions(node.props.children);
        }

        collectOptions(children);

        return (
            <>
            <select
                data-testid="mock-select"
                value={value}
                onChange={(event) => onValueChange?.(event.target.value)}
            >
                {options}
            </select>
                {children}
            </>
        );
    },
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectGroup: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectItem,
}));

function SelectItem() {
    return null;
}

vi.mock('radix-ui', async (importOriginal) => {
    const actual = await importOriginal<typeof import('radix-ui')>();

    return {
        ...actual,
        Select: {
            ...actual.Select,
            Item: () => null,
            ItemText: ({children}: { children: ReactNode }) => <>{children}</>,
            ItemIndicator: ({children}: { children: ReactNode }) => <>{children}</>,
        },
    };
});

vi.mock('@/components/ui/sheet', () => ({
    Sheet: ({children}: { children: ReactNode }) => <div>{children}</div>,
    SheetTrigger: ({children}: { children: ReactNode }) => <>{children}</>,
    SheetContent: ({children}: { children: ReactNode }) => <div>{children}</div>,
    SheetHeader: ({children}: { children: ReactNode }) => <div>{children}</div>,
    SheetTitle: ({children}: { children: ReactNode }) => <h2>{children}</h2>,
    SheetDescription: ({children}: { children: ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/components/ui/tabs', () => ({
    Tabs: ({children}: { children: ReactNode }) => <div>{children}</div>,
    TabsList: ({children}: { children: ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({children, value, disabled}: { children: ReactNode; value: string; disabled?: boolean }) => (
        <button type="button" role="tab" data-value={value} disabled={disabled}>{children}</button>
    ),
    TabsContent: ({children}: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tooltip', () => ({
    Tooltip: ({children}: { children: ReactNode }) => <>{children}</>,
    TooltipTrigger: ({children}: { children: ReactNode }) => <>{children}</>,
    TooltipContent: ({children}: { children: ReactNode }) => <div>{children}</div>,
}));

function renderControlledEditor(
    zoneType: ZoneType,
    initialConfiguration: Record<string, unknown>,
    errors?: React.ComponentProps<typeof ZoneConfigurationEditor>['errors'],
    onResetStyle = vi.fn(),
    staticImageMediaOptions = [
        {id: 'media-logo', title: 'Logo BDE', thumbUrl: 'https://example.com/logo.png'},
        {id: 'media-banner', title: 'Bannière BDE', thumbUrl: null},
    ],
) {
    const onChange = vi.fn();

    function Harness() {
        const [configurationJson, setConfigurationJson] = useState(initialConfiguration);

        return (
            <ZoneConfigurationEditor
                zoneType={zoneType}
                configurationJson={configurationJson}
                staticImageMediaOptions={staticImageMediaOptions}
                errors={errors}
                onResetStyle={onResetStyle}
                onChange={(nextConfiguration) => {
                    onChange(nextConfiguration);
                    setConfigurationJson(nextConfiguration);
                }}
            />
        );
    }

    render(<Harness />);

    return {onChange, onResetStyle};
}

describe('ZoneConfigurationEditor', () => {
    it('renders playlist display mode choices', () => {
        renderControlledEditor(ZoneType.PLAYLIST, {displayMode: 'fullscreen'});

        expect(screen.getByText('Affichage de la playlist')).toBeInTheDocument();
        expect(screen.getByRole('tab', {name: 'Plein écran'})).toBeInTheDocument();
        expect(screen.getByRole('tab', {name: 'Carousel'})).toBeInTheDocument();
    });

    it('updates carousel appearance settings', () => {
        const {onChange} = renderControlledEditor(ZoneType.PLAYLIST, {displayMode: 'carousel'});

        expect(screen.getByLabelText('Arrondi médias')).toHaveValue(8);
        expect(screen.getByLabelText('Espacement')).toHaveValue(32);
        expect(screen.getByLabelText('Assombrissement')).toHaveValue(0.42);

        fireEvent.change(screen.getByLabelText('Arrondi médias'), {target: {value: '24'}});
        fireEvent.change(screen.getByLabelText('Espacement'), {target: {value: '48'}});
        fireEvent.change(screen.getByLabelText('Assombrissement'), {target: {value: '0.3'}});

        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
            displayMode: 'carousel',
            carouselMediaBorderRadius: 24,
            carouselItemGap: 48,
            carouselSideDimOpacity: 0.3,
        }));
    });

    it('renders playlist display mode errors', () => {
        renderControlledEditor(ZoneType.PLAYLIST, {displayMode: 'ticker'}, {
            displayMode: {message: 'Mode d\'affichage invalide.'},
        });

        expect(screen.getByText('Mode d\'affichage invalide.')).toBeInTheDocument();
    });

    it('updates shared zone style settings', () => {
        const {onChange} = renderControlledEditor(ZoneType.PLAYLIST, {
            backgroundColor: 'transparent',
        });

        fireEvent.change(screen.getByLabelText('Fond'), {target: {value: '#112233'}});
        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
            backgroundColor: '#112233',
        }));

        fireEvent.change(screen.getByLabelText('Coins arrondis'), {target: {value: '32'}});
        fireEvent.change(screen.getByLabelText('Marge intérieure'), {target: {value: '24'}});
        fireEvent.change(screen.getByLabelText('Bordure'), {target: {value: '2'}});
        fireEvent.change(screen.getByLabelText('Couleur bordure'), {target: {value: '#ffffff55'}});
        fireEvent.change(screen.getByLabelText('Opacité'), {target: {value: '0.85'}});

        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
            backgroundColor: '#112233',
            borderRadius: 32,
            padding: 24,
            borderWidth: 2,
            borderColor: '#ffffff55',
            opacity: 0.85,
        }));
    });

    it('updates static text settings without losing style settings', () => {
        const {onChange} = renderControlledEditor(ZoneType.STATIC, {
            backgroundColor: '#000000',
            text: 'Ancien texte',
            color: '#ffffff',
        });

        fireEvent.change(screen.getByLabelText('Texte'), {target: {value: 'Nouveau texte'}});
        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
            backgroundColor: '#000000',
            contentType: 'text',
            text: 'Nouveau texte',
            color: '#ffffff',
            mediaItemId: undefined,
            fit: undefined,
        }));

        fireEvent.change(screen.getByLabelText('Couleur texte'), {target: {value: '#ffcc00'}});
        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
            backgroundColor: '#000000',
            contentType: 'text',
            text: 'Nouveau texte',
            color: '#ffcc00',
        }));
    });

    it('updates static image settings and clears text-only fields', () => {
        const {onChange} = renderControlledEditor(ZoneType.STATIC, {
            backgroundColor: '#000000',
            contentType: 'image',
            mediaItemId: 'media-logo',
            fit: 'contain',
            text: 'Ancien texte',
            color: '#ffffff',
        });

        const mediaSelect = screen.getAllByTestId('mock-select').find((select) =>
            (select as HTMLSelectElement).value === 'media-logo',
        );
        expect(mediaSelect).toBeDefined();

        fireEvent.change(mediaSelect!, {target: {value: 'media-banner'}});

        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
            backgroundColor: '#000000',
            contentType: 'image',
            mediaItemId: 'media-banner',
            fit: 'contain',
            text: undefined,
            color: undefined,
        }));
    });

    it('disables static image configuration when media images are not allowed', () => {
        render(
            <ZoneConfigurationEditor
                zoneType={ZoneType.STATIC}
                configurationJson={{contentType: 'text', text: 'Logo'}}
                staticImagesAllowed={false}
                onChange={vi.fn()}
            />,
        );

        expect(screen.getByRole('tab', {name: 'Image'})).toBeDisabled();
        expect(screen.getByText(
            'Les images statiques liées à la médiathèque sont disponibles uniquement sur les modèles d\'organisation.',
        )).toBeInTheDocument();
    });

    it('shows an explicit empty media message when no static images are available', () => {
        renderControlledEditor(
            ZoneType.STATIC,
            {contentType: 'image', mediaItemId: '', fit: 'contain'},
            undefined,
            vi.fn(),
            [],
        );

        expect(screen.getAllByText('Aucune image disponible dans la médiathèque.')).toHaveLength(1);
    });

    it('does not mark zone style as invalid for static image media errors', () => {
        renderControlledEditor(
            ZoneType.STATIC,
            {contentType: 'image', mediaItemId: '', fit: 'contain'},
            {
                mediaItemId: {message: 'Sélectionnez une image de la médiathèque.'},
            },
        );

        expect(screen.getByRole('button', {name: 'Style de zone'})).toHaveAttribute('aria-invalid', 'false');
        expect(screen.getByText('Sélectionnez une image de la médiathèque.')).toBeInTheDocument();
    });

    it('renders field-level errors on the style sheet trigger and fields', () => {
        renderControlledEditor(ZoneType.PLAYLIST, {}, {
            backgroundColor: {message: 'Couleur invalide.'},
            padding: {message: 'Marge invalide.'},
        });

        expect(screen.getByRole('button', {name: 'Style de zone'})).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Fond')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Marge intérieure')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByText('Couleur invalide.')).toBeInTheDocument();
        expect(screen.getByText('Marge invalide.')).toBeInTheDocument();
    });

    it('calls the reset style action from the style sheet', () => {
        const {onResetStyle} = renderControlledEditor(ZoneType.PLAYLIST, {});

        fireEvent.click(screen.getByRole('button', {name: 'Réinitialiser les styles'}));

        expect(onResetStyle).toHaveBeenCalledOnce();
        expect(screen.getByRole('button', {name: 'Réinitialiser les styles'})).toBeInTheDocument();
    });
});
