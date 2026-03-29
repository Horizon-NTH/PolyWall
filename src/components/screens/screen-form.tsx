'use client';

import { useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { approvePendingScreen, updateScreen } from '@/actions/screen-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NumberStepperInput } from '@/components/ui/number-stepper-input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    screenApproveSchema,
    type ScreenApproveValues,
    screenUpdateSchema,
    type ScreenUpdateValues,
} from '@/schemas/screen-schema';

type ScreenFormValues = ScreenApproveValues;

type ScreenChannelOption = {
    id: string;
    name: string;
};

type ScreenFormProps = {
    mode: 'approve' | 'edit';
    screenId: string;
    channels: ScreenChannelOption[];
    defaultValues?: Partial<ScreenUpdateValues>;
    cancelHref: string;
};

const MAX_SCREEN_INACTIVITY_TIMEOUT_SECONDS = 24 * 3600;

export function ScreenForm({
                               mode,
                               screenId,
                               channels,
                               defaultValues,
                               cancelHref,
                           }: ScreenFormProps) {
    const router = useRouter();
    const isApprove = mode === 'approve';
    const [isPending, startTransition] = useTransition();

    const resolver = zodResolver(
        isApprove ? screenApproveSchema : screenUpdateSchema,
    ) as Resolver<ScreenFormValues>;

    const form = useForm<ScreenFormValues>({
        resolver,
        defaultValues: {
            name: '',
            location: '',
            channelId: '',
            interactive: false,
            interactiveUrl: '',
            inactivityTimeoutSeconds: undefined,
            ...defaultValues,
        },
    });
    const isInteractive = useWatch({control: form.control, name: 'interactive'});

    useEffect(() => {
        if (!isInteractive) {
            form.setValue('interactiveUrl', '', {shouldDirty: true, shouldValidate: true});
            form.setValue('inactivityTimeoutSeconds', undefined, {shouldDirty: true, shouldValidate: true});
        }
    }, [form, isInteractive]);

    async function onSubmit(values: ScreenFormValues) {
        form.clearErrors('root');

        const result = isApprove
            ? await approvePendingScreen(screenId, values)
            : await updateScreen(screenId, values);

        if (!result.ok) {
            form.setError((result.field ?? 'root') as keyof ScreenFormValues, {
                message: result.message,
            });
            return;
        }

        toast.success(isApprove ? 'Écran validé.' : 'Écran mis à jour.');
        startTransition(() => {
            router.push(`/dashboard/screens/${screenId}`);
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{isApprove ? 'Valider l\'écran' : 'Modifier l\'écran'}</CardTitle>
                <CardDescription>
                    {isApprove
                        ? 'Complétez les informations de cet écran en attente puis validez-le.'
                        : 'Mettez à jour les informations de cet écran.'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FieldGroup>
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

                        <Controller
                            name="location"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="location">Localisation</FieldLabel>
                                    <Input {...field} id="location" aria-invalid={fieldState.invalid} required />
                                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                </Field>
                            )}
                        />

                        <Controller
                            name="channelId"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="channelId">Canal</FieldLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger id="channelId" className="w-full"
                                                       aria-invalid={fieldState.invalid}>
                                            <SelectValue placeholder="Sélectionnez un canal" />
                                        </SelectTrigger>
                                        <SelectContent align="start">
                                            {channels.map((channel) => (
                                                <SelectItem key={channel.id} value={channel.id}>
                                                    {channel.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                </Field>
                            )}
                        />

                        <Controller
                            name="interactive"
                            control={form.control}
                            render={({field}) => (
                                <Field>
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="interactive"
                                            checked={field.value}
                                            onCheckedChange={(value) => field.onChange(Boolean(value))}
                                        />
                                        <FieldLabel htmlFor="interactive">Écran interactif</FieldLabel>
                                    </div>
                                    <FieldDescription className="text-muted-foreground text-xs">
                                        Autorise l&apos;écran à afficher une expérience interactive.
                                    </FieldDescription>
                                </Field>
                            )}
                        />

                        <Controller
                            name="interactiveUrl"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="interactiveUrl">URL interactive</FieldLabel>
                                    <Input
                                        {...field}
                                        id="interactiveUrl"
                                        aria-invalid={fieldState.invalid}
                                        disabled={!isInteractive}
                                        placeholder={isInteractive ? 'https://...' : 'Activez "Écran interactif"'}
                                    />
                                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                </Field>
                            )}
                        />

                        <Controller
                            name="inactivityTimeoutSeconds"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="inactivityTimeoutSeconds">Timeout inactivité
                                        (secondes)</FieldLabel>
                                    <NumberStepperInput
                                        id="inactivityTimeoutSeconds"
                                        value={Number.isFinite(field.value) ? field.value : undefined}
                                        onValueChange={field.onChange}
                                        min={1}
                                        max={MAX_SCREEN_INACTIVITY_TIMEOUT_SECONDS}
                                        disabled={!isInteractive}
                                        ariaInvalid={fieldState.invalid}
                                        placeholder={isInteractive ? 'Ex: 120' : 'Activez "Écran interactif"'}
                                        allowEmpty
                                        decrementAriaLabel="Décrément timeout"
                                        incrementAriaLabel="Incrément timeout"
                                    />
                                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                </Field>
                            )}
                        />

                        <Field>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="min-h-5 flex-1">
                                    {form.formState.errors.root ? (
                                        <FieldError errors={[form.formState.errors.root]} />
                                    ) : null}
                                </div>
                                <div className="ml-auto flex items-center gap-2">
                                    <Button asChild variant="outline">
                                        <Link href={cancelHref}>Annuler</Link>
                                    </Button>
                                    <Button type="submit" disabled={form.formState.isSubmitting || isPending}>
                                        {isApprove ? 'Valider' : 'Enregistrer'}
                                    </Button>
                                </div>
                            </div>
                        </Field>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    );
}
