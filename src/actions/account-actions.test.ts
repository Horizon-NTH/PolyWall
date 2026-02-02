import { beforeEach, describe, expect, it } from 'vitest';

import { buildSession, getArgon2Mock, getAuthMocks, mockArgon2Module, mockAuthModule } from '@/test/mocks/auth';
import { getPrismaMock, mockPrismaModule } from '@/test/mocks/prisma';

mockAuthModule();
mockPrismaModule();
mockArgon2Module();

describe('updateProfile', () => {
    beforeEach(async () => {
        const {auth, unstable_update} = await getAuthMocks();
        const prisma = await getPrismaMock();

        auth.mockReset();
        unstable_update.mockReset();
        prisma.user.update.mockReset();
    });

    it('rejects unauthenticated users', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(null);
        const {updateProfile} = await import('@/actions/account-actions');

        const result = await updateProfile({fullName: 'Jean Dupont'});

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous devez être connecté.',
        });
    });

    it('returns the first validation error', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const prisma = await getPrismaMock();
        const {updateProfile} = await import('@/actions/account-actions');

        const result = await updateProfile({fullName: 'A'});

        expect(result).toEqual({
            ok: false,
            field: 'fullName',
            message: 'Le nom complet doit contenir au moins 2 caractères',
        });
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('updates the user profile and session', async () => {
        const {auth, unstable_update} = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession({user: {id: 'user-1'}}));
        const prisma = await getPrismaMock();
        const {updateProfile} = await import('@/actions/account-actions');

        const result = await updateProfile({fullName: 'Jean Dupont'});

        expect(result).toEqual({ok: true});
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: {id: 'user-1'},
            data: {fullName: 'Jean Dupont'},
        });
        expect(unstable_update).toHaveBeenCalledWith({
            user: {name: 'Jean Dupont'},
        });
    });
});

describe('changePassword', () => {
    beforeEach(async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        const argon2 = await getArgon2Mock();

        auth.mockReset();
        prisma.user.findUnique.mockReset();
        prisma.user.update.mockReset();
        argon2.verify.mockReset();
        argon2.hash.mockReset();
    });

    it('rejects unauthenticated users', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(null);
        const {changePassword} = await import('@/actions/account-actions');

        const result = await changePassword({
            currentPassword: 'current-pass',
            newPassword: 'new-password',
            confirmPassword: 'new-password',
        });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous devez être connecté.',
        });
    });

    it('returns the first validation error', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const prisma = await getPrismaMock();
        const {changePassword} = await import('@/actions/account-actions');

        const result = await changePassword({
            currentPassword: 'short',
            newPassword: 'new-password',
            confirmPassword: 'new-password',
        });

        expect(result).toEqual({
            ok: false,
            field: 'currentPassword',
            message: 'Le mot de passe actuel doit contenir au moins 8 caractères',
        });
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('rejects when no local password is configured', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const prisma = await getPrismaMock();
        prisma.user.findUnique.mockResolvedValueOnce({passwordHash: null});
        const {changePassword} = await import('@/actions/account-actions');

        const result = await changePassword({
            currentPassword: 'current-pass',
            newPassword: 'new-password',
            confirmPassword: 'new-password',
        });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Aucun mot de passe local n\'est configuré.',
        });
    });

    it('rejects when the current password is invalid', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const prisma = await getPrismaMock();
        prisma.user.findUnique.mockResolvedValueOnce({passwordHash: 'hash'});
        const argon2 = await getArgon2Mock();
        argon2.verify.mockResolvedValueOnce(false);
        const {changePassword} = await import('@/actions/account-actions');

        const result = await changePassword({
            currentPassword: 'current-pass',
            newPassword: 'new-password',
            confirmPassword: 'new-password',
        });

        expect(result).toEqual({
            ok: false,
            field: 'currentPassword',
            message: 'Mot de passe actuel incorrect.',
        });
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('updates the password when the current password matches', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession({user: {id: 'user-1'}}));
        const prisma = await getPrismaMock();
        prisma.user.findUnique.mockResolvedValueOnce({passwordHash: 'hash'});
        const argon2 = await getArgon2Mock();
        argon2.verify.mockResolvedValueOnce(true);
        argon2.hash.mockResolvedValueOnce('new-hash');
        const {changePassword} = await import('@/actions/account-actions');

        const result = await changePassword({
            currentPassword: 'current-pass',
            newPassword: 'new-password',
            confirmPassword: 'new-password',
        });

        expect(result).toEqual({ok: true});
        expect(argon2.hash).toHaveBeenCalledWith('new-password');
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: {id: 'user-1'},
            data: {passwordHash: 'new-hash'},
        });
    });
});
