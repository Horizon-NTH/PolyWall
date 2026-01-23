import { describe, expect, it } from 'vitest';
import { credentialsSchema } from '@/schemas/auth-schema';

describe('credentialsSchema', () => {
    it('normalizes email by trimming and lowercasing', () => {
        const result = credentialsSchema.safeParse({
            email: '  TEST@Example.Com ',
            password: 'password123',
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.email).toBe('test@example.com');
        }
    });

    it('rejects invalid email formats', () => {
        const result = credentialsSchema.safeParse({
            email: 'not-an-email',
            password: 'password123',
        });

        expect(result.success).toBe(false);
    });

    it('rejects empty email after trimming', () => {
        const result = credentialsSchema.safeParse({
            email: '   ',
            password: 'password123',
        });

        expect(result.success).toBe(false);
    });

    it('rejects short passwords', () => {
        const result = credentialsSchema.safeParse({
            email: 'user@example.com',
            password: 'short',
        });

        expect(result.success).toBe(false);
    });
});
