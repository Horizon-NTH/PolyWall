'use client';

import { useId } from 'react';
import { FileImage, Paintbrush, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { HelpLabel } from '@/components/ui/help-label';
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
import { SelectPreviewItem } from '@/components/ui/select-preview-item';
import { ZoneType } from '@/generated/prisma/enums';
import { getNumberConfig, getStringConfig } from '@/lib/config/json-config';
import { type StaticImageMediaOption } from '@/lib/display-templates/static-media-options';
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
    | 'mediaItemId'
    | 'fit',
    FieldErrorLike
>> & FieldErrorLike;

type ZoneConfigurationEditorProps = {
    zoneType: ZoneType;
    configurationJson: Record<string, unknown>;
    staticImageMediaOptions?: StaticImageMediaOption[];
    staticImagesAllowed?: boolean;
    onChange: (configurationJson: Record<string, unknown>) => void;
    onResetStyle?: () => void;
    errors?: ZoneConfigurationEditorErrors;
};

const ZONE_STYLE_ERROR_KEYS = [
    'backgroundColor',
    'borderColor',
    'borderRadius',
    'padding',
    'borderWidth',
    'shadow',
    'opacity',
] as const;

function hasZoneStyleErrors(errors?: ZoneConfigurationEditorErrors) {
    return Boolean(errors && ZONE_STYLE_ERROR_KEYS.some((key) => errors[key]));
}

function StaticImageMediaOptionPreview({
                                           media,
                                           className,
                                       }: {
    media: StaticImageMediaOption;
    className?: string;
}) {
    return (
        <span className={`flex min-w-0 items-center gap-2 ${className ?? ''}`}>
            <span
                className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm">
                {media.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={media.thumbUrl} alt="" className="size-full object-cover" />
                ) : (
                    <FileImage />
                )}
            </span>
            <span className="min-w-0 truncate">{media.title}</span>
        </span>
    );
}

function StaticImageMediaSelectItem({media}: { media: StaticImageMediaOption }) {
    return (
        <SelectPreviewItem value={media.id} textValue={media.title}>
            <StaticImageMediaOptionPreview media={media} />
        </SelectPreviewItem>
    );
}

export function ZoneConfigurationEditor({
                                            zoneType,
                                            configurationJson,
                                            staticImageMediaOptions = [],
                                            staticImagesAllowed = true,
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
            getStringConfig(configurationJson, 'mediaItemId') ? 'image' : 'text',
        );
        const renderedMode = staticImagesAllowed && mode === 'image' ? 'image' : 'text';
        const selectedMedia = staticImageMediaOptions.find((media) =>
            media.id === getStringConfig(configurationJson, 'mediaItemId'),
        ) ?? null;

        const setMode = (nextMode: string) => {
            const base = {
                ...configurationJson,
                contentType: nextMode,
            };

            onChange(nextMode === 'image'
                ? {
                    ...base,
                    mediaItemId: getStringConfig(configurationJson, 'mediaItemId'),
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
                <Tabs value={renderedMode} onValueChange={setMode} className="gap-3">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="text">Texte</TabsTrigger>
                        <TabsTrigger value="image" disabled={!staticImagesAllowed}>Image</TabsTrigger>
                    </TabsList>
                    {!staticImagesAllowed ? (
                        <p className="text-muted-foreground text-sm">
                            Les images statiques liées à la médiathèque sont disponibles uniquement sur les modèles
                            d&apos;organisation.
                        </p>
                    ) : null}
                    {renderedMode !== 'image' ? (
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
                                            mediaItemId: undefined,
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
                    {renderedMode === 'image' ? (
                        <TabsContent>
                            <FieldGroup className="grid gap-3 md:grid-cols-2">
                                <Field data-invalid={Boolean(errors?.mediaItemId)} className="md:col-span-2">
                                    <FieldLabel htmlFor={`${fieldIdPrefix}-static-media-item`}>
                                        Image
                                    </FieldLabel>
                                    <Select
                                        value={getStringConfig(configurationJson, 'mediaItemId') || undefined}
                                        onValueChange={(value) => onChange({
                                            ...configurationJson,
                                            contentType: 'image',
                                            mediaItemId: value,
                                            text: undefined,
                                            color: undefined,
                                        })}
                                    >
                                        <SelectTrigger
                                            id={`${fieldIdPrefix}-static-media-item`}
                                            className="min-h-14 w-full py-1 data-[size=default]:h-auto"
                                            aria-invalid={Boolean(errors?.mediaItemId)}
                                        >
                                            {selectedMedia ? (
                                                <StaticImageMediaOptionPreview media={selectedMedia}
                                                                               className="flex-1" />
                                            ) : (
                                                <SelectValue placeholder="Sélectionner une image" />
                                            )}
                                        </SelectTrigger>
                                        <SelectContent
                                            align="start"
                                            position="popper"
                                            className="max-w-(--radix-select-trigger-width)"
                                        >
                                            {staticImageMediaOptions.length > 0 ? (
                                                <SelectGroup>
                                                    {staticImageMediaOptions.map((media) => (
                                                        <StaticImageMediaSelectItem key={media.id} media={media} />
                                                    ))}
                                                </SelectGroup>
                                            ) : (
                                                <div className="text-muted-foreground px-2 py-2 text-sm">
                                                    Aucune image disponible dans la médiathèque.
                                                </div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {errors?.mediaItemId ? <FieldError errors={[errors.mediaItemId]} /> : null}
                                </Field>
                                <Field data-invalid={Boolean(errors?.fit)}>
                                    <HelpLabel
                                        htmlFor={`${fieldIdPrefix}-static-fit`}
                                        help="Contenir affiche toute l'image quitte à laisser des marges. Couvrir remplit toute la zone quitte à rogner l'image."
                                    >
                                        Ajustement
                                    </HelpLabel>
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
    const hasErrors = hasZoneStyleErrors(errors);
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
                    className="w-full"
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
                        Ajustez l&apos;apparence visuelle de cette zone sans modifier sa position.
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
