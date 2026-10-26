'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
    type Control,
    Controller,
    type Resolver,
    type UseFormSetValue,
    useFieldArray,
    useForm,
    useWatch,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CopyPlus, Plus, Trash2 } from 'lucide-react';

import { createDisplayTemplate, updateDisplayTemplate } from '@/actions/display-template-actions';
import { DisplayTemplatePreview, getZoneLabel } from '@/components/display-templates/display-template-preview';
import {
    ZoneConfigurationEditor,
    type ZoneConfigurationEditorErrors,
} from '@/components/display-templates/display-template-zone-configuration-editor';
import {
    TransitWidgetConfigurationEditor,
} from '@/components/display-templates/transit/transit-widget-configuration-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { HelpLabel } from '@/components/ui/help-label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ZoneType } from '@/generated/prisma/enums';
import { getNumberConfig, getStringConfig } from '@/lib/config/json-config';
import { type StaticImageMediaOption } from '@/lib/display-templates/static-media-options';
import { removeZoneAppearanceStyleConfig } from '@/lib/display-runtime/template-style';
import {
    getDefaultWidgetConfiguration,
    getDefaultWidgetRefreshPeriodSeconds,
    isSupportedWidgetKey,
} from '@/lib/widgets/widget-catalog';
import {
    displayTemplateCreateSchema,
    type DisplayTemplateCreateValues,
    displayTemplateUpdateSchema,
} from '@/schemas/display-template-schema';

export type WidgetTypeOption = {
    id: string;
    name: string;
    technicalKey: string;
};

type DisplayTemplateFormProps = {
    mode: 'create' | 'edit';
    templateId?: string;
    defaultValues?: DisplayTemplateCreateValues;
    widgetTypes: WidgetTypeOption[];
    staticImageMediaOptions?: StaticImageMediaOption[];
    cancelHref: string;
    canCreateGlobalTemplates?: boolean;
    canCreateOrganizationTemplates?: boolean;
    defaultScope?: DisplayTemplateCreateValues['scope'];
};

type FormValue = DisplayTemplateCreateValues;
type ZoneValue = FormValue['zones'][number];
type WidgetValue = NonNullable<ZoneValue['widgetInstance']>;

type FieldErrorLike = { message?: string };
type WidgetEditorErrors = {
    widgetTypeId?: FieldErrorLike;
    refreshPeriodSeconds?: FieldErrorLike;
    configurationJson?: FieldErrorLike;
};

function defaultZone(zoneType: ZoneType, orderIndex: number): ZoneValue {
    return {
        name: getZoneLabel(zoneType),
        zoneType,
        orderIndex,
        positionX: zoneType === ZoneType.WIDGET ? 1520 : 0,
        positionY: 0,
        width: zoneType === ZoneType.WIDGET ? 400 : 1920,
        height: 1080,
        configurationJson: getDefaultZoneConfiguration(zoneType),
        widgetInstance: null,
    };
}

function getDefaultZoneConfiguration(zoneType: ZoneType): Record<string, unknown> {
    if (zoneType === ZoneType.PLAYLIST) return {displayMode: 'fullscreen'};
    return zoneType === ZoneType.STATIC ? {text: 'Texte', color: '#ffffff'} : {};
}

function createDefaultWidget(widgetType: WidgetTypeOption): WidgetValue {
    return {
        widgetTypeId: widgetType.id,
        active: true,
        refreshPeriodSeconds: getDefaultWidgetRefreshPeriodSeconds(widgetType.technicalKey),
        configurationJson: getDefaultWidgetConfiguration(widgetType.technicalKey),
    };
}

function duplicateZoneValue(
    zone: ZoneValue,
    orderIndex: number,
    resolutionX: number,
    resolutionY: number,
): ZoneValue {
    const maxX = Math.max(0, resolutionX - zone.width);
    const maxY = Math.max(0, resolutionY - zone.height);

    return {
        ...zone,
        id: undefined,
        name: `${zone.name} copie`,
        orderIndex,
        positionX: Math.min(zone.positionX + 40, maxX),
        positionY: Math.min(zone.positionY + 40, maxY),
        configurationJson: {...zone.configurationJson},
        widgetInstance: zone.widgetInstance
            ? {
                ...zone.widgetInstance,
                id: undefined,
                active: true,
                configurationJson: {...zone.widgetInstance.configurationJson},
            }
            : null,
    };
}

function normalizeDefaultValues(
    defaultValues?: DisplayTemplateCreateValues,
    defaultScope: DisplayTemplateCreateValues['scope'] = 'organization',
): FormValue {
    if (!defaultValues) {
        return {
            scope: defaultScope,
            name: '',
            description: '',
            resolutionX: 1920,
            resolutionY: 1080,
            configurationJson: {backgroundColor: '#000000'},
            zones: [defaultZone(ZoneType.PLAYLIST, 0)],
        };
    }

    return {
        ...defaultValues,
        zones: defaultValues.zones.map((zone) => ({
            ...zone,
            widgetInstance: zone.zoneType === ZoneType.WIDGET && zone.widgetInstance
                ? {
                    ...zone.widgetInstance,
                    active: true,
                }
                : null,
        })),
    };
}

function toSubmissionValue(value: FormValue): DisplayTemplateCreateValues {
    const staticImagesAllowed = value.scope === 'organization';

    return {
        ...value,
        zones: value.zones.map((zone) => normalizeZoneForScope(zone, staticImagesAllowed)),
    };
}

function normalizeZoneForScope(zone: ZoneValue, staticImagesAllowed: boolean): ZoneValue {
    const configurationJson = zone.zoneType === ZoneType.STATIC && !staticImagesAllowed
        ? removeStaticImageConfiguration(zone.configurationJson)
        : zone.configurationJson;

    return {
        ...zone,
        configurationJson,
        widgetInstance: zone.zoneType === ZoneType.WIDGET && zone.widgetInstance
            ? {
                ...zone.widgetInstance,
                active: true,
            }
            : null,
    };
}

function removeStaticImageConfiguration(configurationJson: Record<string, unknown>) {
    if (configurationJson.contentType !== 'image') return configurationJson;

    return {
        ...configurationJson,
        contentType: 'text',
        text: getStringConfig(configurationJson, 'text'),
        color: getStringConfig(configurationJson, 'color', '#ffffff'),
        mediaItemId: undefined,
        fit: undefined,
    };
}

function getActionErrorField(field: string | undefined): keyof FormValue | 'root' {
    if (!field || field === 'templateId') return 'root';
    if (
        field === 'name' ||
        field === 'description' ||
        field === 'resolutionX' ||
        field === 'resolutionY' ||
        field === 'configurationJson' ||
        field === 'scope' ||
        field === 'zones'
    ) {
        return field;
    }

    return 'root';
}

function getZoneFieldLabel(field: 'positionX' | 'positionY' | 'width' | 'height' | 'orderIndex') {
    switch (field) {
        case 'positionX':
            return 'Position horizontale';
        case 'positionY':
            return 'Position verticale';
        case 'width':
            return 'Largeur';
        case 'height':
            return 'Hauteur';
        case 'orderIndex':
            return 'Ordre d\'affichage';
    }
}

function getZoneFieldTooltip(field: 'positionX' | 'positionY' | 'width' | 'height' | 'orderIndex') {
    if (field !== 'orderIndex') return null;
    return 'En cas de superposition, la zone avec la valeur la plus élevée passe au-dessus.';
}

function IconButtonTooltip({
                               label,
                               children,
                           }: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {children}
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
                {label}
            </TooltipContent>
        </Tooltip>
    );
}

export function DisplayTemplateForm({
                                        mode,
                                        templateId,
                                        defaultValues,
                                        widgetTypes,
                                        staticImageMediaOptions = [],
                                        cancelHref,
                                        canCreateGlobalTemplates = false,
                                        canCreateOrganizationTemplates = true,
                                        defaultScope = 'organization',
                                    }: DisplayTemplateFormProps) {
    const router = useRouter();
    const isEdit = mode === 'edit';
    const [isPending, startTransition] = React.useTransition();
    const resolver = zodResolver(
        isEdit ? displayTemplateUpdateSchema : displayTemplateCreateSchema,
        undefined,
        {raw: true},
    ) as unknown as Resolver<FormValue>;
    const form = useForm<FormValue>({
        resolver,
        defaultValues: normalizeDefaultValues(defaultValues, defaultScope),
    });
    const zonesFieldArray = useFieldArray({
        control: form.control,
        name: 'zones',
        keyName: 'fieldArrayId',
    });
    const watchedValue = useWatch({control: form.control});
    const formValue = (watchedValue ?? form.getValues()) as FormValue;
    const availableWidgetTypes = widgetTypes.filter((widgetType) => isSupportedWidgetKey(widgetType.technicalKey));
    const firstWidgetType = availableWidgetTypes[0] ?? null;
    const staticImagesAllowed = formValue.scope === 'organization';

    const setScope = (scope: FormValue['scope']) => {
        form.setValue('scope', scope, {
            shouldDirty: true,
            shouldValidate: form.formState.isSubmitted,
        });

        if (scope !== 'global') return;

        form.setValue(
            'zones',
            form.getValues('zones').map((zone) => normalizeZoneForScope(zone, false)),
            {
                shouldDirty: true,
                shouldValidate: form.formState.isSubmitted,
            },
        );
    };

    const addZone = (zoneType: Exclude<ZoneType, typeof ZoneType.PLAYLIST>) => {
        if (zoneType === ZoneType.WIDGET && !firstWidgetType) return;

        zonesFieldArray.append({
            ...defaultZone(zoneType, form.getValues('zones').length),
            widgetInstance: zoneType === ZoneType.WIDGET && firstWidgetType
                ? createDefaultWidget(firstWidgetType)
                : null,
        });
    };

    const removeZone = (zoneIndex: number) => {
        const nextZones = form
            .getValues('zones')
            .filter((_, index) => index !== zoneIndex)
            .map((zone, index) => ({...zone, orderIndex: index}));

        zonesFieldArray.replace(nextZones);
    };

    const duplicateZone = (zoneIndex: number) => {
        const zones = form.getValues('zones');
        const zone = zones[zoneIndex];
        if (!zone || zone.zoneType === ZoneType.PLAYLIST) return;

        zonesFieldArray.append(duplicateZoneValue(
            zone,
            zones.length,
            form.getValues('resolutionX'),
            form.getValues('resolutionY'),
        ));
    };

    const resetZoneStyle = (zoneIndex: number) => {
        const configurationJson = form.getValues(`zones.${zoneIndex}.configurationJson`);

        form.setValue(
            `zones.${zoneIndex}.configurationJson`,
            removeZoneAppearanceStyleConfig(configurationJson),
            {
                shouldDirty: true,
                shouldValidate: form.formState.isSubmitted,
            },
        );
    };

    const submit = (values: FormValue) => {
        startTransition(async () => {
            form.clearErrors('root');
            const payload = toSubmissionValue(values);
            const result = isEdit
                ? await updateDisplayTemplate(templateId ?? '', payload)
                : await createDisplayTemplate(payload);

            if (!result.ok) {
                form.setError(getActionErrorField(result.field), {message: result.message});
                return;
            }

            toast.success(isEdit ? 'Modèle mis à jour.' : 'Modèle créé.');
            router.push(`/dashboard/display-templates/${result.templateId}`);
        });
    };

    const handleInvalidSubmit = () => {
        toast.error('Certains champs du modèle sont invalides.');

        const scrollToFirstInvalidField = () => {
            const firstInvalidField = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]');
            if (!firstInvalidField) return;

            if (typeof firstInvalidField.scrollIntoView === 'function') {
                firstInvalidField.scrollIntoView({behavior: 'smooth', block: 'center'});
            }
            firstInvalidField.focus?.({preventScroll: true});
        };

        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(scrollToFirstInvalidField);
            return;
        }

        scrollToFirstInvalidField();
    };

    const zoneListError = form.formState.errors.zones && !Array.isArray(form.formState.errors.zones)
        ? form.formState.errors.zones
        : undefined;

    return (
        <form
            onSubmit={form.handleSubmit(submit, handleInvalidSubmit)}
            className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]"
        >
            <Card>
                <CardHeader>
                    <CardTitle>{isEdit ? 'Modifier le modèle' : 'Nouveau modèle d\'affichage'}</CardTitle>
                    <CardDescription>
                        Configurez une résolution de référence, la zone playlist et les zones complémentaires.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FieldGroup>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Controller
                                name="name"
                                control={form.control}
                                render={({field, fieldState}) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="name">Nom</FieldLabel>
                                        <Input {...field} id="name" aria-invalid={fieldState.invalid} required />
                                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                    </Field>
                                )}
                            />

                            {!isEdit && canCreateGlobalTemplates ? (
                                <Controller
                                    name="scope"
                                    control={form.control}
                                    render={({field, fieldState}) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel>Portée</FieldLabel>
                                            <Select value={field.value} onValueChange={setScope}>
                                                <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent align="start">
                                                    <SelectGroup>
                                                        <SelectItem
                                                            value="organization"
                                                            disabled={!canCreateOrganizationTemplates}
                                                        >
                                                            Organisation
                                                        </SelectItem>
                                                        <SelectItem value="global">Global</SelectItem>
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                        </Field>
                                    )}
                                />
                            ) : null}

                            <Controller
                                name="configurationJson"
                                control={form.control}
                                render={({field, fieldState}) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="backgroundColor">Fond global</FieldLabel>
                                        <Input
                                            id="backgroundColor"
                                            value={getStringConfig(field.value, 'backgroundColor', '#000000')}
                                            aria-invalid={fieldState.invalid}
                                            onChange={(event) => field.onChange({
                                                ...field.value,
                                                backgroundColor: event.target.value,
                                            })}
                                        />
                                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                    </Field>
                                )}
                            />
                        </div>

                        <Controller
                            name="description"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="description">Description</FieldLabel>
                                    <Textarea
                                        {...field}
                                        id="description"
                                        rows={3}
                                        aria-invalid={fieldState.invalid}
                                        required
                                    />
                                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                </Field>
                            )}
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                            <Controller
                                name="resolutionX"
                                control={form.control}
                                render={({field, fieldState}) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <HelpLabel
                                            htmlFor="resolutionX"
                                            help="Largeur logique utilisée pour placer les zones. Le rendu final garde les mêmes proportions sur chaque écran."
                                        >
                                            Largeur de référence
                                        </HelpLabel>
                                        <Input
                                            id="resolutionX"
                                            type="number"
                                            value={field.value}
                                            aria-invalid={fieldState.invalid}
                                            onChange={(event) => field.onChange(Number(event.target.value))}
                                        />
                                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="resolutionY"
                                control={form.control}
                                render={({field, fieldState}) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <HelpLabel
                                            htmlFor="resolutionY"
                                            help="Hauteur logique utilisée pour placer les zones. 1080 est le choix courant pour un modèle 16:9."
                                        >
                                            Hauteur de référence
                                        </HelpLabel>
                                        <Input
                                            id="resolutionY"
                                            type="number"
                                            value={field.value}
                                            aria-invalid={fieldState.invalid}
                                            onChange={(event) => field.onChange(Number(event.target.value))}
                                        />
                                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                    </Field>
                                )}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => addZone(ZoneType.WIDGET)}
                                disabled={availableWidgetTypes.length === 0}
                            >
                                <Plus data-icon="inline-start" /> Zone widget
                            </Button>
                            <Button type="button" variant="outline" onClick={() => addZone(ZoneType.STATIC)}>
                                <Plus data-icon="inline-start" /> Zone statique
                            </Button>
                        </div>
                        {zoneListError ? <FieldError errors={[zoneListError]} /> : null}

                        <div className="grid gap-4">
                            {zonesFieldArray.fields.map((zoneField, zoneIndex) => {
                                const zone = formValue.zones[zoneIndex] ?? zoneField;
                                const zoneErrors = Array.isArray(form.formState.errors.zones)
                                    ? form.formState.errors.zones[zoneIndex]
                                    : undefined;
                                const canRemoveZone = formValue.zones.length > 1 && zone.zoneType !== ZoneType.PLAYLIST;
                                const canDuplicateZone = zone.zoneType !== ZoneType.PLAYLIST;

                                return (
                                    <Card key={zoneField.fieldArrayId}>
                                        <CardHeader className="flex flex-row items-start justify-between gap-3">
                                            <div>
                                                <CardTitle className="text-base">{zone.name || 'Zone'}</CardTitle>
                                                <CardDescription>{zone.zoneType}</CardDescription>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {canDuplicateZone ? (
                                                    <IconButtonTooltip
                                                        label={`Dupliquer la zone ${zone.name || 'Zone'}`}>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => duplicateZone(zoneIndex)}
                                                            aria-label={`Dupliquer ${zone.name || 'Zone'}`}
                                                        >
                                                            <CopyPlus data-icon="inline-start" />
                                                        </Button>
                                                    </IconButtonTooltip>
                                                ) : null}
                                                {canRemoveZone ? (
                                                    <IconButtonTooltip
                                                        label={`Supprimer la zone ${zone.name || 'Zone'}`}>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeZone(zoneIndex)}
                                                            aria-label={`Supprimer ${zone.name || 'Zone'}`}
                                                        >
                                                            <Trash2 data-icon="inline-start" />
                                                        </Button>
                                                    </IconButtonTooltip>
                                                ) : null}
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <FieldGroup className="gap-4">
                                                <div className="grid gap-3 md:grid-cols-2">
                                                    <Controller
                                                        name={`zones.${zoneIndex}.name`}
                                                        control={form.control}
                                                        render={({field, fieldState}) => (
                                                            <Field data-invalid={fieldState.invalid}>
                                                                <FieldLabel>Nom</FieldLabel>
                                                                <Input
                                                                    {...field}
                                                                    aria-invalid={fieldState.invalid}
                                                                />
                                                                {fieldState.invalid ? (
                                                                    <FieldError errors={[fieldState.error]} />
                                                                ) : null}
                                                            </Field>
                                                        )}
                                                    />

                                                    <Controller
                                                        name={`zones.${zoneIndex}.zoneType`}
                                                        control={form.control}
                                                        render={({field, fieldState}) => (
                                                            <Field
                                                                data-invalid={fieldState.invalid}
                                                                data-disabled={zone.zoneType === ZoneType.PLAYLIST}
                                                            >
                                                                <FieldLabel>Type</FieldLabel>
                                                                <Select
                                                                    value={field.value}
                                                                    disabled={zone.zoneType === ZoneType.PLAYLIST}
                                                                    onValueChange={(value) => {
                                                                        field.onChange(value);
                                                                        form.setValue(
                                                                            `zones.${zoneIndex}.widgetInstance`,
                                                                            value === ZoneType.WIDGET && firstWidgetType
                                                                                ? zone.widgetInstance ?? createDefaultWidget(firstWidgetType)
                                                                                : null,
                                                                            {
                                                                                shouldDirty: true,
                                                                                shouldValidate: form.formState.isSubmitted,
                                                                            },
                                                                        );
                                                                    }}
                                                                >
                                                                    <SelectTrigger
                                                                        className="w-full"
                                                                        aria-invalid={fieldState.invalid}
                                                                    >
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent align="start">
                                                                        <SelectGroup>
                                                                            {Object.values(ZoneType).map((zoneType) => (
                                                                                <SelectItem
                                                                                    key={zoneType}
                                                                                    value={zoneType}
                                                                                    disabled={
                                                                                        zoneType === ZoneType.PLAYLIST ||
                                                                                        (zoneType === ZoneType.WIDGET && availableWidgetTypes.length === 0)
                                                                                    }
                                                                                >
                                                                                    {zoneType}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectGroup>
                                                                    </SelectContent>
                                                                </Select>
                                                                {fieldState.invalid ? (
                                                                    <FieldError errors={[fieldState.error]} />
                                                                ) : null}
                                                            </Field>
                                                        )}
                                                    />
                                                </div>

                                                <div className="grid gap-3 md:grid-cols-5">
                                                    {(['positionX', 'positionY', 'width', 'height', 'orderIndex'] as const).map((fieldName) => (
                                                        <Controller
                                                            key={fieldName}
                                                            name={`zones.${zoneIndex}.${fieldName}`}
                                                            control={form.control}
                                                            render={({field, fieldState}) => {
                                                                const tooltip = getZoneFieldTooltip(fieldName);

                                                                return (
                                                                    <Field data-invalid={fieldState.invalid}>
                                                                        {tooltip ? (
                                                                            <HelpLabel help={tooltip}>
                                                                                {getZoneFieldLabel(fieldName)}
                                                                            </HelpLabel>
                                                                        ) : (
                                                                            <FieldLabel>{getZoneFieldLabel(fieldName)}</FieldLabel>
                                                                        )}
                                                                        <Input
                                                                            type="number"
                                                                            value={field.value}
                                                                            aria-invalid={fieldState.invalid}
                                                                            onChange={(event) => field.onChange(Number(event.target.value))}
                                                                        />
                                                                        {fieldState.invalid ? (
                                                                            <FieldError errors={[fieldState.error]} />
                                                                        ) : null}
                                                                    </Field>
                                                                );
                                                            }}
                                                        />
                                                    ))}
                                                </div>

                                                <Controller
                                                    name={`zones.${zoneIndex}.configurationJson`}
                                                    control={form.control}
                                                    render={({field, fieldState}) => (
                                                        <div>
                                                            <ZoneConfigurationEditor
                                                                zoneType={zone.zoneType}
                                                                configurationJson={field.value}
                                                                staticImageMediaOptions={staticImageMediaOptions}
                                                                staticImagesAllowed={staticImagesAllowed}
                                                                onChange={field.onChange}
                                                                onResetStyle={() => resetZoneStyle(zoneIndex)}
                                                                errors={zoneErrors?.configurationJson as ZoneConfigurationEditorErrors | undefined}
                                                            />
                                                            {fieldState.invalid ? (
                                                                <FieldError errors={[fieldState.error]} />
                                                            ) : null}
                                                        </div>
                                                    )}
                                                />

                                                {zone.zoneType === ZoneType.WIDGET ? (
                                                    <Field data-invalid={Boolean(zoneErrors?.widgetInstance)}>
                                                        {zone.widgetInstance ? (
                                                            <WidgetEditor
                                                                control={form.control}
                                                                errors={zoneErrors?.widgetInstance as WidgetEditorErrors | undefined}
                                                                setValue={form.setValue}
                                                                widget={zone.widgetInstance}
                                                                widgetTypes={availableWidgetTypes}
                                                                zoneIndex={zoneIndex}
                                                            />
                                                        ) : (
                                                            <FieldError>
                                                                Aucun type de widget disponible pour configurer cette
                                                                zone.
                                                            </FieldError>
                                                        )}
                                                        {zoneErrors?.widgetInstance ? (
                                                            <FieldError errors={[zoneErrors.widgetInstance]} />
                                                        ) : null}
                                                    </Field>
                                                ) : null}
                                            </FieldGroup>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        <Field>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <div className="min-h-5 flex-1">
                                    {form.formState.errors.root ? (
                                        <FieldError errors={[form.formState.errors.root]} />
                                    ) : null}
                                </div>
                                <Button type="button" variant="outline" onClick={() => router.push(cancelHref)}>
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={form.formState.isSubmitting || isPending}>
                                    {isEdit ? 'Enregistrer' : 'Créer'}
                                </Button>
                            </div>
                        </Field>
                    </FieldGroup>
                </CardContent>
            </Card>

            <div className="xl:sticky xl:top-4 xl:self-start">
                <Card>
                    <CardHeader>
                        <CardTitle>Aperçu</CardTitle>
                        <CardDescription>
                            L&apos;aperçu montre les proportions finales, pas la taille réelle de l&apos;écran.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DisplayTemplatePreview
                            resolutionX={formValue.resolutionX || 1920}
                            resolutionY={formValue.resolutionY || 1080}
                            zones={(formValue.zones ?? []).map((zone) => ({
                                id: zone.id ?? `${zone.zoneType}-${zone.orderIndex}`,
                                name: zone.name,
                                zoneType: zone.zoneType,
                                orderIndex: zone.orderIndex,
                                positionX: zone.positionX,
                                positionY: zone.positionY,
                                width: zone.width,
                                height: zone.height,
                                configurationJson: zone.configurationJson,
                            }))}
                        />
                    </CardContent>
                </Card>
            </div>
        </form>
    );
}

function WidgetEditor({
                          control,
                          errors,
                          setValue,
                          widget,
                          widgetTypes,
                          zoneIndex,
                      }: {
    control: Control<FormValue>;
    errors?: WidgetEditorErrors;
    setValue: UseFormSetValue<FormValue>;
    widget: WidgetValue;
    widgetTypes: WidgetTypeOption[];
    zoneIndex: number;
}) {
    const widgetType = widgetTypes.find((item) => item.id === widget.widgetTypeId) ?? widgetTypes[0];

    return (
        <Controller
            name={`zones.${zoneIndex}.widgetInstance.widgetTypeId`}
            control={control}
            render={({field, fieldState}) => (
                <Tabs
                    value={field.value}
                    onValueChange={(widgetTypeId) => {
                        const nextType = widgetTypes.find((item) => item.id === widgetTypeId);
                        if (!nextType) return;

                        field.onChange(widgetTypeId);
                        setValue(
                            `zones.${zoneIndex}.widgetInstance.refreshPeriodSeconds`,
                            getDefaultWidgetRefreshPeriodSeconds(nextType.technicalKey),
                            {shouldDirty: true},
                        );
                        setValue(
                            `zones.${zoneIndex}.widgetInstance.configurationJson`,
                            getDefaultWidgetConfiguration(nextType.technicalKey),
                            {shouldDirty: true},
                        );
                    }}
                    className="gap-4"
                >
                    <Field data-invalid={fieldState.invalid || Boolean(errors?.widgetTypeId)}>
                        <FieldLabel>Widget</FieldLabel>
                        <TabsList className="h-auto w-full flex-wrap">
                            {widgetTypes.map((option) => (
                                <TabsTrigger key={option.id} value={option.id} className="min-w-24 flex-1">
                                    {option.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                        {errors?.widgetTypeId ? <FieldError errors={[errors.widgetTypeId]} /> : null}
                    </Field>

                    {widgetTypes.map((option) => (
                        option.id === field.value ? (
                            <TabsContent key={option.id}>
                                <FieldGroup
                                    className={widgetType?.technicalKey === 'clock' ||
                                    widgetType?.technicalKey === 'rss' ||
                                    widgetType?.technicalKey === 'transit' ||
                                    widgetType?.technicalKey === 'weather'
                                        ? 'gap-3'
                                        : 'grid gap-3 md:grid-cols-2'}>
                                    {widgetType?.technicalKey !== 'clock' ? (
                                        <Controller
                                            name={`zones.${zoneIndex}.widgetInstance.refreshPeriodSeconds`}
                                            control={control}
                                            render={({field: refreshField, fieldState: refreshFieldState}) => (
                                                <Field
                                                    data-invalid={refreshFieldState.invalid || Boolean(errors?.refreshPeriodSeconds)}>
                                                    <HelpLabel
                                                        help="Intervalle, en secondes, auquel le widget pourra renouveler ses données. Ce champ servira aux widgets connectés comme RSS, météo ou transports."
                                                    >
                                                        Rafraîchissement
                                                    </HelpLabel>
                                                    <Input
                                                        type="number"
                                                        value={refreshField.value ?? 0}
                                                        aria-invalid={refreshFieldState.invalid || Boolean(errors?.refreshPeriodSeconds)}
                                                        onChange={(event) => refreshField.onChange(Number(event.target.value))}
                                                    />
                                                    {refreshFieldState.invalid ? (
                                                        <FieldError errors={[refreshFieldState.error]} />
                                                    ) : null}
                                                    {errors?.refreshPeriodSeconds ? (
                                                        <FieldError errors={[errors.refreshPeriodSeconds]} />
                                                    ) : null}
                                                </Field>
                                            )}
                                        />
                                    ) : null}
                                    <Controller
                                        name={`zones.${zoneIndex}.widgetInstance.configurationJson`}
                                        control={control}
                                        render={({field: configurationField, fieldState: configurationFieldState}) => (
                                            <Field
                                                data-invalid={configurationFieldState.invalid || Boolean(errors?.configurationJson)}>
                                                <WidgetConfigurationEditor
                                                    technicalKey={widgetType?.technicalKey ?? ''}
                                                    configurationJson={configurationField.value ?? {}}
                                                    onChange={configurationField.onChange}
                                                />
                                                {configurationFieldState.invalid ? (
                                                    <FieldError errors={[configurationFieldState.error]} />
                                                ) : null}
                                                {errors?.configurationJson ? (
                                                    <FieldError errors={[errors.configurationJson]} />
                                                ) : null}
                                            </Field>
                                        )}
                                    />
                                </FieldGroup>
                            </TabsContent>
                        ) : null
                    ))}
                </Tabs>
            )}
        />
    );
}

function WidgetConfigurationEditor({
                                       technicalKey,
                                       configurationJson,
                                       onChange,
                                   }: {
    technicalKey: string;
    configurationJson: Record<string, unknown>;
    onChange: (configurationJson: Record<string, unknown>) => void;
}) {
    if (technicalKey === 'clock') {
        return (
            <FieldGroup className="grid gap-3 md:grid-cols-2">
                <Field>
                    <FieldLabel>Timezone</FieldLabel>
                    <Input
                        value={getStringConfig(configurationJson, 'timezone', 'Europe/Paris')}
                        onChange={(event) => onChange({...configurationJson, timezone: event.target.value})}
                    />
                </Field>
                <Field>
                    <FieldLabel>Format</FieldLabel>
                    <Select
                        value={getStringConfig(configurationJson, 'format', 'HH:mm')}
                        onValueChange={(value) => onChange({...configurationJson, format: value})}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="start">
                            <SelectGroup>
                                <SelectItem value="HH:mm">HH:mm</SelectItem>
                                <SelectItem value="HH:mm:ss">HH:mm:ss</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </Field>
            </FieldGroup>
        );
    }

    if (technicalKey === 'transit') {
        return <TransitWidgetConfigurationEditor configurationJson={configurationJson} onChange={onChange} />;
    }

    if (technicalKey === 'rss') {
        return (
            <FieldGroup className="grid gap-3 md:grid-cols-2">
                <Field className="md:col-span-2">
                    <HelpLabel
                        help="URL publique d'un flux RSS ou Atom. Le flux est récupéré côté serveur et affiché sous forme de texte."
                    >
                        URL du flux
                    </HelpLabel>
                    <Input
                        placeholder="https://exemple.com/feed.xml"
                        value={getStringConfig(configurationJson, 'source')}
                        onChange={(event) => onChange({...configurationJson, source: event.target.value})}
                    />
                </Field>
                <Field className="md:col-span-2">
                    <FieldLabel>Nombre d&apos;éléments</FieldLabel>
                    <Input
                        type="number"
                        min={1}
                        max={20}
                        value={getNumberConfig(configurationJson, 'maxItems', 5)}
                        onChange={(event) => onChange({...configurationJson, maxItems: Number(event.target.value)})}
                    />
                </Field>
            </FieldGroup>
        );
    }

    if (technicalKey === 'weather') {
        const displayMode = getStringConfig(configurationJson, 'displayMode', 'compact');

        return (
            <FieldGroup className="gap-3">
                <Field>
                    <HelpLabel help="Ville utilisée pour récupérer la météo via Open-Meteo.">
                        Ville
                    </HelpLabel>
                    <Input
                        placeholder="Paris"
                        value={getStringConfig(configurationJson, 'city', 'Paris')}
                        onChange={(event) => onChange({...configurationJson, city: event.target.value})}
                    />
                </Field>
                <Field>
                    <FieldLabel>Affichage</FieldLabel>
                    <Select
                        value={displayMode}
                        onValueChange={(value) => onChange({...configurationJson, displayMode: value})}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="start">
                            <SelectGroup>
                                <SelectItem value="compact">Compact</SelectItem>
                                <SelectItem value="current">Détaillé</SelectItem>
                                <SelectItem value="forecast">Prévisions</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </Field>
                {displayMode === 'forecast' ? (
                    <Field>
                        <FieldLabel>Nombre de jours</FieldLabel>
                        <Input
                            type="number"
                            min={1}
                            max={7}
                            value={getNumberConfig(configurationJson, 'forecastDays', 3)}
                            onChange={(event) => onChange({...configurationJson, forecastDays: Number(event.target.value)})}
                        />
                    </Field>
                ) : null}
            </FieldGroup>
        );
    }

    return (
        <FieldGroup className="grid gap-3 md:grid-cols-2">
            <Field>
                <FieldLabel>Source</FieldLabel>
                <Input
                    value={getStringConfig(configurationJson, 'source')}
                    onChange={(event) => onChange({...configurationJson, source: event.target.value})}
                />
            </Field>
            <Field>
                <FieldLabel>Nombre max</FieldLabel>
                <Input
                    type="number"
                    value={getNumberConfig(configurationJson, 'maxItems', 5)}
                    onChange={(event) => onChange({...configurationJson, maxItems: Number(event.target.value)})}
                />
            </Field>
        </FieldGroup>
    );
}
