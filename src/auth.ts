import NextAuth, { CredentialsSignin, type NextAuthConfig, type Session, type User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import argon2 from 'argon2';
import { prisma } from '@/lib/prisma';
import { credentialsSchema } from '@/schemas/auth-schema';
import { env } from '@/env';
import { JWT } from 'next-auth/jwt';
import { consumeLoginAttempt, RateLimitExceeded, resetLoginAttempt } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

class RateLimitedError extends CredentialsSignin {
    code = 'rate_limited';
}

function isRateLimitExceeded(error: unknown): error is RateLimitExceeded {
    if (error instanceof RateLimitExceeded) {
        return true;
    }
    return error instanceof Error && error.message === 'rate_limited';
}

function getRequestIp(request: Request): string | null {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        const first = forwarded.split(',')[0]?.trim();
        if (first) return first;
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp;

    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) return cfIp;

    return null;
}

export const authConfig = {
    secret: env.AUTH_SECRET,
    trustHost: env.AUTH_TRUST_HOST ?? false,
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/login',
    },
    providers: [
        Credentials({
            name: 'Credentials',
            credentials: {
                email: {
                    label: 'Email',
                    type: 'email',
                },
                password: {
                    label: 'Password',
                    type: 'password',
                },
            },
            async authorize(raw, request) {
                const parsed = credentialsSchema.safeParse(raw);
                if (!parsed.success) return null;

                const email = parsed.data.email.toLowerCase();
                const password = parsed.data.password;
                const ip = request ? getRequestIp(request) ?? 'unknown' : 'unknown';

                try {
                    await consumeLoginAttempt({ip, email});
                } catch (error) {
                    if (isRateLimitExceeded(error)) {
                        throw new RateLimitedError();
                    }
                    logger.error({error}, 'Rate limiter unavailable during login');
                }

                const user = await prisma.user.findUnique({
                    where: {email},
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                        passwordHash: true,
                        role: true,
                        organizationId: true,
                        active: true,
                    },
                });

                if (!user?.passwordHash) return null;
                if (!user.active) return null;

                try {
                    const ok = await argon2.verify(user.passwordHash, password);
                    if (!ok) return null;
                } catch {
                    return null;
                }

                await resetLoginAttempt({ip, email});
                return {
                    id: user.id,
                    email: user.email,
                    name: user.fullName,
                    role: user.role,
                    organizationId: user.organizationId,
                } as User;
            },
        }),
    ],

    callbacks: {
        async jwt({token, user, trigger, session}) {
            if (user) {
                token.role = user.role;
                token.organizationId = user.organizationId;
                token.userId = user.id;
                token.name = user.name;
                token.email = user.email;
            }
            if (trigger === 'update' && session?.user) {
                if (session.user.organizationId !== undefined) {
                    token.organizationId = session.user.organizationId;
                }
                if (session.user.name !== undefined) {
                    token.name = session.user.name;
                }
                if (session.user.email !== undefined) {
                    token.email = session.user.email;
                }
            }
            return token;
        },
        async session({session, token}: { session: Session, token: JWT }) {
            session.user = {
                id: token.userId,
                email: token.email,
                name: token.name,
                role: token.role,
                organizationId: token.organizationId,
            };
            return session;
        },
    },
} satisfies NextAuthConfig;

export const {handlers, auth, signIn, signOut, unstable_update} = NextAuth(authConfig);
