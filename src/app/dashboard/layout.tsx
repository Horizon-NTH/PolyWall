import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { AppSidebar } from '@/components/sidebar/app-sidebar';
import {
    SidebarInset,
    SidebarProvider,
} from '@/components/ui/sidebar';

type DashboardLayoutProps = {
    children: React.ReactNode
};

export default async function DashboardLayout({children}: DashboardLayoutProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
    );
}
