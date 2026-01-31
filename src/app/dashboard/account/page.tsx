import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { AccountProfileForm } from '@/components/account/account-profile-form';
import { AccountPasswordForm } from '@/components/account/account-password-form';
import { UserRole } from '@/generated/prisma/enums';

const roleLabels: Record<UserRole, string> = {
    PLATFORM_SUPER_ADMIN: 'Super admin plateforme',
    ORGANIZATION_ADMIN: 'Admin organisation',
    CONTENT_MANAGER: 'Gestionnaire de contenu',
};

export default async function Page() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const organization =
        session.user.organizationId
            ? await prisma.organization.findUnique({
                where: {id: session.user.organizationId},
                select: {name: true},
            })
            : null;

    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2">
                <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"
                    />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="/dashboard">
                                    Tableau de bord
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Compte</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>
            <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
                <div className="flex flex-col gap-1 px-1">
                    <h1 className="text-xl font-semibold">Compte</h1>
                    <p className="text-muted-foreground text-sm">
                        Gerer vos informations personnelles et votre acces.
                    </p>
                </div>
                <div className="grid gap-6 lg:grid-cols-5">
                    <div className="flex flex-col gap-6 lg:col-span-3">
                        <AccountProfileForm
                            user={{
                                name: session.user.name,
                                email: session.user.email,
                            }}
                        />
                        <AccountPasswordForm />
                    </div>
                    <div className="flex flex-col gap-6 lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Organisation</CardTitle>
                                <CardDescription>
                                    Informations liees a votre établissement.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-3 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Organisation</p>
                                    <p className="font-medium">
                                        {organization?.name ?? 'Aucune organisation'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Role</p>
                                    <p className="font-medium">
                                        {roleLabels[session.user.role]}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}
