import { Form, Head, usePage } from '@inertiajs/react';
import { ArrowRight, Stethoscope, Users } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = { status?: string; canResetPassword: boolean };
export default function Login({ status, canResetPassword }: Props) {
    const prototype = usePage().props.prototypeMode;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    function demo(role: string) {
        setEmail(role + '@neu.test');
        setPassword('Prototype123!');
    }
    return (
        <>
            <Head title="Staff sign in" />
            <PasskeyVerify />
            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-5">
                            <div className="grid gap-2.5">
                                <Label htmlFor="email" className="text-xs">
                                    Email address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                    autoComplete="email"
                                    placeholder="your.email@neu.edu.ph"
                                    className="h-11"
                                />
                                <InputError message={errors.email} />
                            </div>
                            <div className="grid gap-2.5">
                                <div className="flex items-center justify-between">
                                    <Label
                                        htmlFor="password"
                                        className="text-xs"
                                    >
                                        Password
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="text-[11px] text-primary"
                                        >
                                            Forgot password?
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    required
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    className="h-11"
                                />
                                <InputError message={errors.password} />
                            </div>
                            <div className="flex items-center gap-2.5">
                                <Checkbox id="remember" name="remember" />
                                <Label
                                    htmlFor="remember"
                                    className="text-xs font-normal text-muted-foreground"
                                >
                                    Keep me signed in
                                </Label>
                            </div>
                            <Button
                                type="submit"
                                className="mt-1 h-11 w-full"
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing ? <Spinner /> : null}Sign in to your
                                workspace
                                <ArrowRight className="ml-auto size-4" />
                            </Button>
                        </div>
                    </>
                )}
            </Form>
            {prototype && (
                <div className="mt-7 rounded-xl border bg-muted/35 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-[11px] font-medium">
                            Explore the prototype
                        </p>
                        <span className="text-[9px] text-muted-foreground">
                            Sample accounts
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-9 bg-card text-xs"
                            onClick={() => demo('clinic')}
                        >
                            <Stethoscope className="size-3.5" />
                            Clinic team
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-9 bg-card text-xs"
                            onClick={() => demo('registrar')}
                        >
                            <Users className="size-3.5" />
                            Registrar
                        </Button>
                    </div>
                    <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
                        Choose an account to fill in the form, then sign in.
                    </p>
                </div>
            )}
            {status && (
                <p className="mt-5 text-center text-sm font-medium text-primary">
                    {status}
                </p>
            )}
        </>
    );
}
Login.layout = {
    title: 'Staff sign in',
    description: 'Use your staff account to access the NEU Health Portal.',
};
