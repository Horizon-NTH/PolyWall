import { describe, expect, it } from 'vitest';

import { userCreateSchema, userUpdateSchema } from '@/schemas/user-schema';

const baseUser = {
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    description: 'Gestionnaire principal',
    active: true,
};

describe('userCreateSchema', () => {
    it('rejects invalid email', () => {
        const result = userCreateSchema.safeParse({
            ...baseUser,
            email: 'not-an-email',
            password: 'Password123!',
            confirmPassword: 'Password123!',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path[0]).toBe('email');
        }
    });

    it('rejects mismatched passwords', () => {
        const result = userCreateSchema.safeParse({
            ...baseUser,
            password: 'Password123!',
            confirmPassword: 'Password456!',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path[0]).toBe('confirmPassword');
        }
    });

    it('accepts valid payload', () => {
        const result = userCreateSchema.safeParse({
            ...baseUser,
            password: 'Password123!',
            confirmPassword: 'Password123!',
        });

        expect(result.success).toBe(true);
    });
});

describe('userUpdateSchema', () => {
    it('rejects short name', () => {
        const result = userUpdateSchema.safeParse({
            ...baseUser,
            fullName: 'A',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path[0]).toBe('fullName');
        }
    });

    it('accepts valid update payload', () => {
        const result = userUpdateSchema.safeParse(baseUser);
        expect(result.success).toBe(true);
    });
});
