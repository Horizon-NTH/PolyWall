import 'next-auth';
import 'next-auth/jwt';
import { UserRole } from '@/generated/prisma/enums';

declare module 'next-auth' {
    interface User {
        id: string;
        email: string;
        name: string;
        role: UserRole;
        organizationId: string | null;
    }

    interface Session {
        user: User;
        expires: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        userId: string;
        name: string;
        email: string;
        role: UserRole;
        organizationId: string | null;
    }
}
