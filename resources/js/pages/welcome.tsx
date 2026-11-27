import { Head, Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { login } from '@/routes';

export default function Welcome() {
    return (
        <>
            <Head title="NEU Health Portal" />
            <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
                <section className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-sm sm:p-10">
                    <AppLogoIcon className="mb-6 size-14 text-primary" />
                    <p className="mb-2 text-sm font-medium text-primary">
                        New Era University
                    </p>
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                        NEU Health Portal
                    </h1>
                    <p className="mt-3 max-w-md text-base leading-7 text-muted-foreground">
                        Clinic and registrar staff can manage student visits and
                        verify medical clearances for enrollment.
                    </p>
                    <Button asChild size="lg" className="mt-7">
                        <Link href={login()}>
                            Staff sign in
                            <ArrowRight aria-hidden="true" />
                        </Link>
                    </Button>
                </section>
            </main>
        </>
    );
}
