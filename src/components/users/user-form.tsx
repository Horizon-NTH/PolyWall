'use client';

import { useRouter } from 'next/navigation';
import { type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { createUser, updateUser } from '@/actions/user-actions';
import {
    ManagedUserForm,
    type ManagedUserFormResult,
    type ManagedUserFormValues,
} from '@/components/users/managed-user-form';
import { userCreateSchema, userUpdateSchema } from '@/schemas/user-schema';

type UserCreateValues = z.infer<typeof userCreateSchema>;
type UserUpdateValues = z.infer<typeof userUpdateSchema>;

type UserFormProps = {
    mode: 'create' | 'edit';
    userId?: string;
    defaultValues?: Partial<UserCreateValues>;
    cancelHref: string;
};

export function UserForm({
                             mode,
                             userId,
                             defaultValues,
                             cancelHref,
                         }: UserFormProps) {
    const router = useRouter();
    const isEdit = mode === 'edit';

    const resolver = zodResolver(
        isEdit ? userUpdateSchema : userCreateSchema,
    ) as Resolver<ManagedUserFormValues>;

    const handleSubmit = async (values: ManagedUserFormValues): Promise<ManagedUserFormResult> => {
        if (isEdit) {
            return updateUser(userId ?? '', values as UserUpdateValues);
        }
        return createUser(values as UserCreateValues);
    };

    const handleSuccess = () => {
        if (isEdit) {
            router.push(cancelHref);
        } else {
            router.push('/dashboard/users');
        }
    };

    return (
        <ManagedUserForm
            mode={mode}
            resolver={resolver}
            defaultValues={defaultValues}
            cancelHref={cancelHref}
            onSubmit={handleSubmit}
            onSuccess={handleSuccess}
            title={isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
            description="Gérez les informations et l'accès utilisateur."
            successMessage={isEdit ? 'Utilisateur mis à jour.' : 'Utilisateur créé.'}
            showPasswordFields={!isEdit}
        />
    );
}
