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
    }) => (
        <select
            data-testid="mock-select"
            value={value}
            onChange={(event) => onValueChange?.(event.target.value)}
        >
            {children}
        </select>
    ),
    SelectTrigger: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectValue: () => null,
    SelectContent: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectGroup: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({value, children}: { value: string; children: ReactNode }) => (
        <option value={value}>{children}</option>
    ),
}));

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

function renderControlledEditor(
    zoneType: ZoneType,
    initialConfiguration: Record<string, unknown>,
    errors?: React.ComponentProps<typeof ZoneConfigurationEditor>['errors'],
    onResetStyle = vi.fn(),
) {
    const onChange = vi.fn();

    function Harness() {
        const [configurationJson, setConfigurationJson] = useState(initialConfiguration);

        return (
            <ZoneConfigurationEditor
                zoneType={zoneType}
                configurationJson={configurationJson}
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
            imageUrl: undefined,
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
            imageUrl: 'https://example.com/image-a.png',
            fit: 'contain',
            text: 'Ancien texte',
            color: '#ffffff',
        });

        fireEvent.change(screen.getByLabelText('URL image'), {
            target: {value: 'https://example.com/image-b.png'},
        });

        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
            backgroundColor: '#000000',
            contentType: 'image',
            imageUrl: 'https://example.com/image-b.png',
            fit: 'contain',
            text: undefined,
            color: undefined,
        }));
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
