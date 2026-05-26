'use client';

import { useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { deleteMediaItem, updateMediaItem } from '@/actions/media-actions';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { isUploadMediaError, uploadMediaWithIntent } from '@/lib/media/media-upload-client';
import type { MediaKind } from '@/lib/media/media-view-model';
import { appendReturnTo } from '@/lib/return-to';
import {
    MAX_MEDIA_DURATION_SECONDS,
    mediaCreateSchema,
    mediaUpdateSchema,
    type MediaUpdateValues,
} from '@/schemas/media-schema';
import { NumberStepperInput } from '@/components/ui/number-stepper-input';

type MediaFormValues = {
    title: string;
    description: string;
    durationSeconds: number;
    active: boolean;
    file?: File;
};

type MediaFormProps = {
    mode: 'create' | 'edit';
    mediaItemId?: string;
    organizationId?: string;
    mediaKind?: MediaKind;
    defaultValues?: Partial<MediaUpdateValues>;
    cancelHref: string;
};

export function MediaForm({
                              mode,
                              mediaItemId,
                              organizationId,
                              mediaKind,
                              defaultValues,
                              cancelHref,
                          }: MediaFormProps) {
    const router = useRouter();
    const isEdit = mode === 'edit';
    const [isPending, startTransition] = useTransition();

    const resolver = zodResolver(
        isEdit ? mediaUpdateSchema : mediaCreateSchema,
    ) as Resolver<MediaFormValues>;

    const form = useForm<MediaFormValues>({
        resolver,
        defaultValues: {
            title: '',
            description: '',
            durationSeconds: 10,
            active: true,
            ...defaultValues,
        },
    });
    const selectedFile = useWatch({control: form.control, name: 'file'});
    const isVideoFromFile = !isEdit && Boolean(selectedFile?.type?.startsWith('video/'));
    const isVideoDurationLocked = isEdit ? mediaKind === 'video' : isVideoFromFile;

    useEffect(() => {
        if (isVideoFromFile) {
            form.setValue('durationSeconds', 60, {shouldDirty: true, shouldValidate: true});
        }
    }, [isVideoFromFile, form]);

    async function onSubmit(values: MediaFormValues) {
        form.clearErrors('root');

        if (isEdit) {
            const result = await updateMediaItem(mediaItemId ?? '', values as MediaUpdateValues);
            if (!result.ok) {
                form.setError((result.field ?? 'root') as keyof MediaFormValues, {
                    message: result.message,
                });
                return;
            }

            toast.success('Média mis à jour.');
            startTransition(() => {
                router.push(cancelHref);
            });
            return;
        }

        const file = values.file;
        if (!file) {
            form.setError('file', {message: 'Le fichier est requis.'});
            return;
        }

        try {
            const uploaded = await uploadMediaWithIntent({
                file,
                title: values.title,
                description: values.description,
                durationSeconds: values.durationSeconds,
                organizationId,
            });

            toast.success('Média créé.');
            startTransition(() => {
                router.push(appendReturnTo(`/dashboard/media/${uploaded.mediaItemId}`, cancelHref));
            });
        } catch (error) {
            if (isUploadMediaError(error) && error.mediaItemId) {
                const rollback = await deleteMediaItem(error.mediaItemId);
                if (!rollback.ok) {
                    toast.error('Rollback incomplet: suppression automatique impossible.');
                }
            }
            form.setError('root', {
                message: error instanceof Error ? error.message : 'Échec de création du média.',
            });
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{isEdit ? 'Modifier le média' : 'Nouveau média'}</CardTitle>
                <CardDescription>
                    {isEdit
                        ? 'Modifiez les métadonnées de ce média.'
                        : 'Importez un fichier et renseignez ses informations principales.'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FieldGroup>
                        <Controller
                            name="title"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="title">Titre</FieldLabel>
                                    <Input {...field} id="title" aria-invalid={fieldState.invalid} required />
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
                                    <Textarea {...field} id="description" rows={4} aria-invalid={fieldState.invalid}
                                              required />
                                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                </Field>
                            )}
                        />

                        <Controller
                            name="durationSeconds"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="durationSeconds">Durée (secondes)</FieldLabel>
                                    <NumberStepperInput
                                        id="durationSeconds"
                                        value={Number.isFinite(field.value) ? field.value : undefined}
                                        onValueChange={field.onChange}
                                        min={1}
                                        max={MAX_MEDIA_DURATION_SECONDS}
                                        disabled={isVideoDurationLocked}
                                        ariaInvalid={fieldState.invalid}
                                        required
                                        decrementFromEmptyToMin
                                    />
                                    <FieldDescription>
                                        {isVideoDurationLocked
                                            ? 'Durée verrouillée pour les vidéos (calcul automatique).'
                                            : 'Pour les vidéos, la durée réelle sera ajustée automatiquement après traitement.'}
                                    </FieldDescription>
                                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                </Field>
                            )}
                        />

                        {!isEdit ? (
                            <Controller
                                name="file"
                                control={form.control}
                                render={({field, fieldState}) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="file">Fichier média</FieldLabel>
                                        <Input
                                            id="file"
                                            type="file"
                                            accept="image/*,video/*,application/pdf,.ppt,.pptx"
                                            onChange={(event) => {
                                                const file = event.target.files?.[0];
                                                field.onChange(file);
                                                if (file?.type.startsWith('video/')) {
                                                    form.setValue('durationSeconds', 60, {
                                                        shouldDirty: true,
                                                        shouldValidate: true,
                                                    });
                                                }
                                            }}
                                            aria-invalid={fieldState.invalid}
                                        />
                                        <FieldDescription>
                                            Formats supportés: images, vidéos, PDF, PPT et PPTX.
                                        </FieldDescription>
                                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                    </Field>
                                )}
                            />
                        ) : null}

                        <Controller
                            name="active"
                            control={form.control}
                            render={({field}) => (
                                <Field>
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="active"
                                            checked={field.value}
                                            onCheckedChange={(value) => field.onChange(Boolean(value))}
                                        />
                                        <FieldLabel htmlFor="active">Média actif</FieldLabel>
                                    </div>
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
