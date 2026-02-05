'use client';

import { deleteAdmin, toggleAdminActive } from '@/actions/admin-actions';
import { ManagedUserActionsCard } from '@/components/users/managed-user-actions-card';

type AdminActionsCardProps = {
    adminId: string;
    adminName: string;
    isActive: boolean;
};

export function AdminActionsCard({adminId, adminName, isActive}: AdminActionsCardProps) {
    return (
        <ManagedUserActionsCard
            entityLabel={adminName}
            isActive={isActive}
            onToggle={() => toggleAdminActive(adminId)}
            onDelete={() => deleteAdmin(adminId)}
            onDeletedRedirect="/dashboard/administrators"
            toggleActiveLabel={isActive ? 'Administrateur désactivé.' : 'Administrateur activé.'}
            deleteSuccessLabel="Administrateur supprimé."
            description="Gérez le statut de l'administrateur."
        />
    );
}
