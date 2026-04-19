'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { createChannel, updateChannel } from '@/actions/channel-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    channelCreateSchema,
    type ChannelCreateValues,
    channelUpdateSchema,
    type ChannelUpdateValues,
} from '@/schemas/channel-schema';

type ChannelFormValues = ChannelCreateValues;

export type ChannelTemplateOption = {
    id: string;
    name: string;
    organizationId: string | null;
};

type ChannelFormProps = {
    mode: 'create' | 'edit';
    channelId?: string;
    defaultValues?: Partial<ChannelUpdateValues>;
    templates: ChannelTemplateOption[];
    cancelHref: string;
};

export function ChannelForm({
                                mode,
                                channelId,
                                defaultValues,
                                templates,
                                cancelHref,
                            }: ChannelFormProps) {
    const router = useRouter();
    const isEdit = mode === 'edit';
    const [isPending, startTransition] = useTransition();

    const resolver = zodResolver(
        isEdit ? channelUpdateSchema : channelCreateSchema,
    ) as Resolver<ChannelFormValues>;

    const form = useForm<ChannelFormValues>({
        resolver,
        defaultValues: {
            name: '',
            description: '',
            displayTemplateId: '',
            ...defaultValues,
        },
    });

    const globalTemplates = templates.filter((template) => template.organizationId === null);
    const organizationTemplates = templates.filter((template) => template.organizationId !== null);
    const hasTemplates = templates.length > 0;
    const isCreateBlocked = !isEdit && !hasTemplates;

    async function onSubmit(values: ChannelFormValues) {
        form.clearErrors('root');

        if (isEdit) {
            const result = await updateChannel(channelId ?? '', values);
            if (!result.ok) {
                form.setError((result.field ?? 'root') as keyof ChannelFormValues, {
                    message: result.message,
                });
                return;
            }

            toast.success('Canal mis à jour.');
            startTransition(() => {
                router.push(cancelHref);
            });
            return;
        }

        const result = await createChannel(values);
        if (!result.ok) {
            form.setError((result.field ?? 'root') as keyof ChannelFormValues, {
                message: result.message,
            });
            return;
        }

        toast.success('Canal créé.');
        startTransition(() => {
            router.push(`/dashboard/channels/${result.channelId}`);
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{isEdit ? 'Modifier le canal' : 'Nouveau canal'}</CardTitle>
                <CardDescription>
                    {isEdit
                        ? 'Mettez à jour les informations de votre canal.'
                        : 'Renseignez les informations de base de votre canal.'}
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
                            name="description"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="description">Description</FieldLabel>
                                    <Textarea
                                        {...field}
                                        id="description"
                                        rows={4}
                                        aria-invalid={fieldState.invalid}
                                        required
                                    />
                                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                </Field>
                            )}
                        />

                        <Controller
                            name="displayTemplateId"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="displayTemplateId">Modèle d&apos;affichage</FieldLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger
                                            id="displayTemplateId"
                                            aria-invalid={fieldState.invalid}
                                            className="w-full"
                                            disabled={!hasTemplates}
                                        >
                                            <SelectValue placeholder="Sélectionnez un modèle" />
                                        </SelectTrigger>
                                        <SelectContent align="start">
                                            {globalTemplates.length > 0 ? (
                                                <SelectGroup>
                                                    <SelectLabel>Globaux</SelectLabel>
                                                    {globalTemplates.map((template) => (
                                                        <SelectItem key={template.id} value={template.id}>
                                                            {template.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            ) : null}
                                            {organizationTemplates.length > 0 ? (
                                                <SelectGroup>
                                                    <SelectLabel>Organisation</SelectLabel>
                                                    {organizationTemplates.map((template) => (
                                                        <SelectItem key={template.id} value={template.id}>
                                                            {template.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            ) : null}
                                        </SelectContent>
                                    </Select>
                                    {isCreateBlocked ? (
                                        <p className="text-destructive text-sm">
                                            Impossible de créer un canal sans modèle d&apos;affichage. Créez
                                            d&apos;abord un
                                            modèle d&apos;affichage.
                                        </p>
                                    ) : null}
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
                                    <Button
                                        type="submit"
                                        disabled={form.formState.isSubmitting || isPending || isCreateBlocked}
                                    >
                                        {isEdit ? 'Enregistrer' : 'Créer'}
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
