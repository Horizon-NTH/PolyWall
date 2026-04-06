'use client';

import { useRouter } from 'next/navigation';
import { type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { createAdmin, updateAdmin } from '@/actions/admin-actions';
import {
    ManagedUserForm,
    type ManagedUserFormValues,
    type ManagedUserFormResult,
} from '@/components/users/managed-user-form';
import { adminCreateSchema, adminUpdateSchema } from '@/schemas/admin-schema';
import { UserRole } from '@/generated/prisma/enums';
import { adminRoleOptions } from '@/lib/roles';

type AdminCreateValues = z.infer<typeof adminCreateSchema>;

type AdminUpdateValues = z.infer<typeof adminUpdateSchema>;

type OrganizationOption = {
    id: string;
    name: string;
};

type AdminFormProps = {
    mode: 'create' | 'edit';
    adminId?: string;
    defaultValues?: Partial<AdminCreateValues>;
    organizations: OrganizationOption[];
    cancelHref: string;
};

export function AdminForm({
                              mode,
                              adminId,
                              defaultValues,
                              organizations,
                              cancelHref,
                          }: AdminFormProps) {
    const router = useRouter();
    const isEdit = mode === 'edit';

    const resolver = zodResolver(
        isEdit ? adminUpdateSchema : adminCreateSchema,
    ) as Resolver<ManagedUserFormValues>;

    const handleSubmit = async (values: ManagedUserFormValues): Promise<ManagedUserFormResult> => {
        if (isEdit) {
            return updateAdmin(adminId ?? '', values as AdminUpdateValues);
        }
        return createAdmin(values as AdminCreateValues);
    };

    const handleSuccess = () => {
        if (isEdit) {
            router.push(cancelHref);
        } else {
            router.push('/dashboard/administrators');
        }
    };

    return (
        <ManagedUserForm
            mode={mode}
            resolver={resolver}
            defaultValues={{
                role: UserRole.ORGANIZATION_ADMIN,
                organizationId: null,
                ...defaultValues,
            }}
            cancelHref={cancelHref}
            onSubmit={handleSubmit}
            onSuccess={handleSuccess}
            title={isEdit ? 'Modifier l\'administrateur' : 'Nouvel administrateur'}
            description="Gérez l'accès administrateur et l'organisation associée."
            successMessage={isEdit ? 'Administrateur mis à jour.' : 'Administrateur créé.'}
            showRole
            roleOptions={adminRoleOptions}
            showOrganization
            organizations={organizations}
            organizationDisabledMessage="Les super admins ne sont pas rattachés à une organisation."
            isOrganizationEnabled={(role) => role === UserRole.ORGANIZATION_ADMIN}
            showPasswordFields={!isEdit}
        />
    );
}
