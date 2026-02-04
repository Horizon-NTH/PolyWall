'use client';

import { deleteUser, toggleUserActive } from '@/actions/user-actions';
import { ManagedUserActionsCard } from '@/components/users/managed-user-actions-card';

type UserActionsCardProps = {
    userId: string;
    userName: string;
    isActive: boolean;
};

export function UserActionsCard({userId, userName, isActive}: UserActionsCardProps) {
    return (
        <ManagedUserActionsCard
            entityLabel={userName}
            isActive={isActive}
            onToggle={() => toggleUserActive(userId)}
            onDelete={() => deleteUser(userId)}
            onDeletedRedirect="/dashboard/users"
            toggleActiveLabel={isActive ? 'Utilisateur désactivé.' : 'Utilisateur activé.'}
            deleteSuccessLabel="Utilisateur supprimé."
            description="Gérez le statut de l'utilisateur."
        />
    );
}
