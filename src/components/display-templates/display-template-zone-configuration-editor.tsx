'use client';

import { useId } from 'react';
import { Paintbrush, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ZoneType } from '@/generated/prisma/enums';
import { getNumberConfig, getStringConfig } from '@/lib/config/json-config';
import { getDefaultZonePadding, getZoneShadow, ZONE_SHADOW_OPTIONS } from '@/lib/display-runtime/template-style';

type FieldErrorLike = { message?: string };
export type ZoneConfigurationEditorErrors = Partial<Record<
    | 'backgroundColor'
    | 'borderColor'
    | 'borderRadius'
    | 'padding'
    | 'borderWidth'
    | 'shadow'
    | 'opacity'
    | 'contentType'
    | 'text'
    | 'color'
    | 'imageUrl'
    | 'fit',
    FieldErrorLike
>> & FieldErrorLike;

type ZoneConfigurationEditorProps = {
    zoneType: ZoneType;
    configurationJson: Record<string, unknown>;
    onChange: (configurationJson: Record<string, unknown>) => void;
    onResetStyle?: () => void;
    errors?: ZoneConfigurationEditorErrors;
};

export function ZoneConfigurationEditor({
                                            zoneType,
                                            configurationJson,
                                            onChange,
                                            onResetStyle,
                                            errors,
                                        }: ZoneConfigurationEditorProps) {
    const fieldIdPrefix = useId();
    const styleEditor = (
        <ZoneStyleSheet
            zoneType={zoneType}
            configurationJson={configurationJson}
            onChange={onChange}
            onResetStyle={onResetStyle}
            errors={errors}
        />
    );

    if (zoneType === ZoneType.PLAYLIST) {
        return styleEditor;
    }

    if (zoneType === ZoneType.STATIC) {
        const mode = getStringConfig(
            configurationJson,
            'contentType',
            getStringConfig(configurationJson, 'imageUrl') ? 'image' : 'text',
        );

        const setMode = (nextMode: string) => {
            const base = {
                ...configurationJson,
                contentType: nextMode,
            };

            onChange(nextMode === 'image'
                ? {
                    ...base,
                    imageUrl: getStringConfig(configurationJson, 'imageUrl'),
                    fit: getStringConfig(configurationJson, 'fit', 'contain'),
                }
                : {
                    ...base,
                    text: getStringConfig(configurationJson, 'text'),
                    color: getStringConfig(configurationJson, 'color', '#ffffff'),
                });
        };

        return (
            <div className="flex flex-col gap-3">
                {styleEditor}
                <Tabs value={mode === 'image' ? 'image' : 'text'} onValueChange={setMode} className="gap-3">
                    <TabsList>
                        <TabsTrigger value="text">Texte</TabsTrigger>
                        <TabsTrigger value="image">Image</TabsTrigger>
                    </TabsList>
                    {mode !== 'image' ? (
                        <TabsContent>
                            <FieldGroup className="grid gap-3 md:grid-cols-2">
                                <Field data-invalid={Boolean(errors?.text)}>
                                    <FieldLabel htmlFor={`${fieldIdPrefix}-static-text`}>Texte</FieldLabel>
                                    <Input
                                        id={`${fieldIdPrefix}-static-text`}
                                        value={getStringConfig(configurationJson, 'text')}
                                        aria-invalid={Boolean(errors?.text)}
                                        onChange={(event) => onChange({
                                            ...configurationJson,
                                            contentType: 'text',
                                            text: event.target.value,
                                            imageUrl: undefined,
                                            fit: undefined,
                                        })}
                                    />
                                    {errors?.text ? <FieldError errors={[errors.text]} /> : null}
                                </Field>
                                <Field data-invalid={Boolean(errors?.color)}>
                                    <FieldLabel htmlFor={`${fieldIdPrefix}-static-color`}>
                                        Couleur texte
                                    </FieldLabel>
                                    <Input
                                        id={`${fieldIdPrefix}-static-color`}
                                        value={getStringConfig(configurationJson, 'color', '#ffffff')}
                                        aria-invalid={Boolean(errors?.color)}
                                        onChange={(event) => onChange({
                                            ...configurationJson,
                                            contentType: 'text',
                                            color: event.target.value,
                                        })}
                                    />
                                    {errors?.color ? <FieldError errors={[errors.color]} /> : null}
                                </Field>
                            </FieldGroup>
                        </TabsContent>
                    ) : null}
                    {mode === 'image' ? (
                        <TabsContent>
                            <FieldGroup className="grid gap-3 md:grid-cols-2">
                                <Field data-invalid={Boolean(errors?.imageUrl)}>
                                    <FieldLabel htmlFor={`${fieldIdPrefix}-static-image-url`}>
                                        URL image
                                    </FieldLabel>
                                    <Input
                                        id={`${fieldIdPrefix}-static-image-url`}
                                        value={getStringConfig(configurationJson, 'imageUrl')}
                                        aria-invalid={Boolean(errors?.imageUrl)}
                                        onChange={(event) => onChange({
                                            ...configurationJson,
                                            contentType: 'image',
                                            imageUrl: event.target.value,
                                            text: undefined,
                                            color: undefined,
                                        })}
                                    />
                                    {errors?.imageUrl ? <FieldError errors={[errors.imageUrl]} /> : null}
                                </Field>
                                <Field data-invalid={Boolean(errors?.fit)}>
                                    <FieldLabel htmlFor={`${fieldIdPrefix}-static-fit`}>
                                        Ajustement
                                    </FieldLabel>
                                    <Select
                                        value={getStringConfig(configurationJson, 'fit', 'contain')}
                                        onValueChange={(value) => onChange({
                                            ...configurationJson,
                                            contentType: 'image',
                                            fit: value,
                                        })}
                                    >
                                        <SelectTrigger
                                            id={`${fieldIdPrefix}-static-fit`}
                                            className="w-full"
                                            aria-invalid={Boolean(errors?.fit)}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent align="start">
                                            <SelectGroup>
                                                <SelectItem value="contain">Contenir</SelectItem>
                                                <SelectItem value="cover">Couvrir</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    {errors?.fit ? <FieldError errors={[errors.fit]} /> : null}
                                </Field>
                            </FieldGroup>
                        </TabsContent>
                    ) : null}
                </Tabs>
            </div>
        );
    }

    return styleEditor;
}

function ZoneStyleSheet({
                            zoneType,
                            configurationJson,
                            onChange,
                            onResetStyle,
                            errors,
                        }: ZoneConfigurationEditorProps) {
    const hasErrors = Boolean(errors && Object.keys(errors).length > 0);
    const setNumberConfig = (key: string, value: number) => {
        onChange({...configurationJson, [key]: Number.isFinite(value) ? value : 0});
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    aria-invalid={hasErrors}
                >
                    <Paintbrush data-icon="inline-start" />
                    Style de zone
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Style de zone</SheetTitle>
                    <SheetDescription>
                        Ajustez l’apparence visuelle de cette zone sans modifier sa position.
                    </SheetDescription>
                </SheetHeader>
                <FieldGroup className="px-4 pb-4">
                    {onResetStyle ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-fit"
                            onClick={onResetStyle}
                        >
                            <RotateCcw data-icon="inline-start" />
                            Réinitialiser les styles
                        </Button>
                    ) : null}
                    {errors?.message ? <FieldError errors={[errors]} /> : null}
                    <Field data-invalid={Boolean(errors?.backgroundColor)}>
                        <FieldLabel htmlFor="zone-background-color">Fond</FieldLabel>
                        <Input
                            id="zone-background-color"
                            value={getStringConfig(configurationJson, 'backgroundColor', 'transparent')}
                            aria-invalid={Boolean(errors?.backgroundColor)}
                            onChange={(event) => onChange({
                                ...configurationJson,
                                backgroundColor: event.target.value,
                            })}
                        />
                        {errors?.backgroundColor ? <FieldError errors={[errors.backgroundColor]} /> : null}
                    </Field>

                    <div className="grid gap-3 md:grid-cols-2">
                        <Field data-invalid={Boolean(errors?.borderRadius)}>
                            <FieldLabel htmlFor="zone-border-radius">Coins arrondis</FieldLabel>
                            <Input
                                id="zone-border-radius"
                                type="number"
                                min={0}
                                value={getNumberConfig(configurationJson, 'borderRadius', 0)}
                                aria-invalid={Boolean(errors?.borderRadius)}
                                onChange={(event) => setNumberConfig('borderRadius', Number(event.target.value))}
                            />
                            {errors?.borderRadius ? <FieldError errors={[errors.borderRadius]} /> : null}
                        </Field>
                        <Field data-invalid={Boolean(errors?.padding)}>
                            <FieldLabel htmlFor="zone-padding">Marge intérieure</FieldLabel>
                            <Input
                                id="zone-padding"
                                type="number"
                                min={0}
                                value={getNumberConfig(configurationJson, 'padding', getDefaultZonePadding(zoneType))}
                                aria-invalid={Boolean(errors?.padding)}
                                onChange={(event) => setNumberConfig('padding', Number(event.target.value))}
                            />
                            {errors?.padding ? <FieldError errors={[errors.padding]} /> : null}
                        </Field>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <Field data-invalid={Boolean(errors?.borderWidth)}>
                            <FieldLabel htmlFor="zone-border-width">Bordure</FieldLabel>
                            <Input
                                id="zone-border-width"
                                type="number"
                                min={0}
                                value={getNumberConfig(configurationJson, 'borderWidth', 0)}
                                aria-invalid={Boolean(errors?.borderWidth)}
                                onChange={(event) => setNumberConfig('borderWidth', Number(event.target.value))}
                            />
                            {errors?.borderWidth ? <FieldError errors={[errors.borderWidth]} /> : null}
                        </Field>
                        <Field data-invalid={Boolean(errors?.borderColor)}>
                            <FieldLabel htmlFor="zone-border-color">Couleur bordure</FieldLabel>
                            <Input
                                id="zone-border-color"
                                value={getStringConfig(configurationJson, 'borderColor', '#ffffff33')}
                                aria-invalid={Boolean(errors?.borderColor)}
                                onChange={(event) => onChange({...configurationJson, borderColor: event.target.value})}
                            />
                            {errors?.borderColor ? <FieldError errors={[errors.borderColor]} /> : null}
                        </Field>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <Field data-invalid={Boolean(errors?.shadow)}>
                            <FieldLabel>Ombre</FieldLabel>
                            <Select
                                value={getZoneShadow(configurationJson)}
                                onValueChange={(value) => onChange({...configurationJson, shadow: value})}
                            >
                                <SelectTrigger className="w-full" aria-invalid={Boolean(errors?.shadow)}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="start">
                                    <SelectGroup>
                                        {ZONE_SHADOW_OPTIONS.map((shadow) => (
                                            <SelectItem key={shadow} value={shadow}>
                                                {shadow === 'none' ? 'Aucune' : shadow.toUpperCase()}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            {errors?.shadow ? <FieldError errors={[errors.shadow]} /> : null}
                        </Field>
                        <Field data-invalid={Boolean(errors?.opacity)}>
                            <FieldLabel htmlFor="zone-opacity">Opacité</FieldLabel>
                            <Input
                                id="zone-opacity"
                                type="number"
                                min={0}
                                max={1}
                                step={0.05}
                                value={getNumberConfig(configurationJson, 'opacity', 1)}
                                aria-invalid={Boolean(errors?.opacity)}
                                onChange={(event) => setNumberConfig('opacity', Number(event.target.value))}
                            />
                            {errors?.opacity ? <FieldError errors={[errors.opacity]} /> : null}
                        </Field>
                    </div>
                </FieldGroup>
            </SheetContent>
        </Sheet>
    );
}
