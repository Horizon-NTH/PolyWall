import { describe, expect, it } from 'vitest';

import { changePasswordSchema, profileSchema } from '@/schemas/account-schema';

describe('profileSchema', () => {
    it('rejects short names', () => {
        const result = profileSchema.safeParse({fullName: 'A'});
        expect(result.success).toBe(false);
    });

    it('accepts valid names', () => {
        const result = profileSchema.safeParse({fullName: 'Jean Dupont'});
        expect(result.success).toBe(true);
    });
});

describe('changePasswordSchema', () => {
    it('rejects mismatched confirmation', () => {
        const result = changePasswordSchema.safeParse({
            currentPassword: 'CurrentPass123!',
            newPassword: 'NewPassword123!',
            confirmPassword: 'Mismatch123!',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path[0]).toBe('confirmPassword');
        }
    });

    it('accepts matching passwords', () => {
        const result = changePasswordSchema.safeParse({
            currentPassword: 'CurrentPass123!',
            newPassword: 'NewPassword123!',
            confirmPassword: 'NewPassword123!',
        });
        expect(result.success).toBe(true);
    });
});
