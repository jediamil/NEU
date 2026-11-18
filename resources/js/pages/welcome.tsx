import { Head, Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { login } from '@/routes';

export default function Welcome() {
    return (
        <>
            <Head title="NEU Health Portal" />
            <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background p-8">
                <AppLogoIcon className="size-14 text-primary" />
                <h1 className="text-3xl font-semibold tracking-tight">
                    NEU Health Portal
                </h1>
                <p className="text-sm text-muted-foreground">
                    A connected workspace for the New Era University clinic.
                </p>
                <Button asChild>
                    <Link href={login()}>Staff sign in</Link>
                </Button>
            </main>
        </>
    );
}
