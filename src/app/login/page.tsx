import { LoginForm } from '@/components/login-form';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default async function Page() {
    const session = await auth();
    if (session) redirect('/dashboard');
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <Link href="/"
                      className="flex items-center gap-2 self-center font-semibold text-xl text-blue-dark">
                    <Image src="/logo.svg" alt="Logo PolyWall" width={32} height={32} className="size-8" />
                    PolyWall
                </Link>
                <LoginForm />
            </div>
        </div>
    );
}
