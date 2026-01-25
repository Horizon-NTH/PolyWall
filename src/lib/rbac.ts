import { Session } from 'next-auth';
import { UserRole } from '@/generated/prisma/enums';

export function isSuperAdmin(session: Session) {
    return session.user.role === UserRole.PLATFORM_SUPER_ADMIN;
}