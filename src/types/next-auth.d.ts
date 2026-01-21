import { UserRole } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
    interface Session {
        user: {
            role: UserRole
            organizationId: string | null
        } & DefaultSession['user'];
    }

    interface User {
        role: UserRole;
        organizationId: string | null;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        role?: UserRole;
        organizationId?: string | null;
    }
}
