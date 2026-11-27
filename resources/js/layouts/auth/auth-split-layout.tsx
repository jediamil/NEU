import { CalendarCheck2, ClipboardCheck } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(20rem,2fr)_3fr]">
            <aside className="hidden flex-col justify-between gap-16 bg-[#124735] p-12 text-white lg:flex xl:p-16">
                <div className="flex items-center gap-3">
                    <AppLogoIcon className="size-11" />
                    <span className="text-lg font-semibold">
                        New Era University
                    </span>
                </div>
                <div className="max-w-sm">
                    <h2 className="text-4xl font-semibold tracking-tight">
                        NEU Health Portal
                    </h2>
                    <p className="mt-4 text-base leading-7 text-emerald-50/85">
                        The university clinic and registrar workspace for
                        student visits and medical clearances.
                    </p>
                    <ul className="mt-7 grid gap-4 border-t border-white/25 pt-6 text-sm text-emerald-50/90">
                        <li className="flex items-center gap-3">
                            <CalendarCheck2
                                className="size-5"
                                aria-hidden="true"
                            />
                            Clinic appointments and check-in
                        </li>
                        <li className="flex items-center gap-3">
                            <ClipboardCheck
                                className="size-5"
                                aria-hidden="true"
                            />
                            Enrollment clearance verification
                        </li>
                    </ul>
                </div>
                <p className="text-sm text-emerald-50/80">University Clinic</p>
            </aside>
            <main className="flex min-w-0 items-center justify-center px-4 py-8 sm:px-10 sm:py-12">
                <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
                    <div className="mb-7 flex items-center gap-2 border-b pb-5 text-primary lg:hidden">
                        <AppLogoIcon className="size-8" />
                        <span className="font-semibold">NEU Health Portal</span>
                    </div>
                    {title && (
                        <div className="mb-6">
                            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                {title}
                            </h1>
                            {description && (
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    {description}
                                </p>
                            )}
                        </div>
                    )}
                    {children}
                </div>
            </main>
        </div>
    );
}
