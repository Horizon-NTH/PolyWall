import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import argon2 from 'argon2';
import { prisma } from '@/lib/prisma';
import { credentialsSchema } from '@/app/schemas/auth.schema';

export const {handlers, auth, signIn, signOut} = NextAuth({
    trustHost: true,
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
            async authorize(raw) {
                const parsed = credentialsSchema.safeParse(raw);
                if (!parsed.success) return null;

                const email = parsed.data.email.toLowerCase();
                const password = parsed.data.password;

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

                const ok = await argon2.verify(user.passwordHash, password);
                if (!ok) return null;

                return {
                    id: user.id,
                    email: user.email,
                    name: user.fullName,
                    role: user.role,
                    organizationId: user.organizationId,
                };
            },
        }),
    ],

    callbacks: {
        async jwt({token, user}) {
            if (user) {
                token.role = user.role;
                token.organizationId = user.organizationId;
            }
            return token;
        },
        async session({session, token}) {
            if (session.user) {
                session.user.id = token.sub!;
                session.user.role = token.role;
                session.user.organizationId = token.organizationId;
            }
            return session;
        },
    },
});
