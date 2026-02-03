import { describe, expect, it } from 'vitest';

import { adminCreateSchema, adminUpdateSchema } from '@/schemas/admin-schema';
import { UserRole } from '@/generated/prisma/enums';

const baseAdmin = {
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    description: 'Administrateur principal',
    role: UserRole.PLATFORM_SUPER_ADMIN,
    organizationId: null,
    active: true,
};

describe('adminCreateSchema', () => {
    it('rejects non-admin roles', () => {
        const result = adminCreateSchema.safeParse({
            ...baseAdmin,
            role: UserRole.CONTENT_MANAGER,
            password: 'Password123!',
            confirmPassword: 'Password123!',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path[0]).toBe('role');
        }
    });

    it('requires an organization for organization admins', () => {
        const result = adminCreateSchema.safeParse({
            ...baseAdmin,
            role: UserRole.ORGANIZATION_ADMIN,
            organizationId: null,
            password: 'Password123!',
            confirmPassword: 'Password123!',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            const paths = result.error.issues.map((issue) => issue.path[0]);
            expect(paths).toContain('organizationId');
        }
    });

    it('rejects mismatched passwords', () => {
        const result = adminCreateSchema.safeParse({
            ...baseAdmin,
            password: 'Password123!',
            confirmPassword: 'Password456!',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path[0]).toBe('confirmPassword');
        }
    });
});

describe('adminUpdateSchema', () => {
    it('accepts valid super admin without organization', () => {
        const result = adminUpdateSchema.safeParse({
            ...baseAdmin,
            role: UserRole.PLATFORM_SUPER_ADMIN,
            organizationId: null,
        });
        expect(result.success).toBe(true);
    });

    it('requires an organization for organization admins', () => {
        const result = adminUpdateSchema.safeParse({
            ...baseAdmin,
            role: UserRole.ORGANIZATION_ADMIN,
            organizationId: null,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            const paths = result.error.issues.map((issue) => issue.path[0]);
            expect(paths).toContain('organizationId');
        }
    });
});
