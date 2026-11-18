import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { login } from '@/routes';

export default function RegistrationClosed() {
    return (
        <>
            <Head title="Staff access" />
            <p className="text-sm leading-6 text-muted-foreground">
                Staff accounts are provided by the clinic. Use your assigned
                account to sign in.
            </p>
            <Button asChild className="mt-5 w-full">
                <Link href={login()}>Back to sign in</Link>
            </Button>
        </>
    );
}
RegistrationClosed.layout = {
    title: 'Staff access',
    description:
        'Your clinic workspace is available through an assigned staff account.',
};
