import { DashboardHeader } from '@/components/dashboard/dashboard-header';
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
import { getRoleLabel } from '@/lib/roles';


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
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Compte'},
                ]}
            />
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
                                    <p className="font-medium max-w-60 truncate"
                                       title={organization?.name ?? 'Aucune organisation'}>
                                        {organization?.name ?? 'Aucune organisation'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Role</p>
                                    <p className="font-medium">
                                        {getRoleLabel(session.user.role)}
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
