import { CalendarCheck2, HeartHandshake, ShieldCheck } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="grid min-h-dvh bg-card lg:grid-cols-[0.95fr_1.05fr]">
            <aside className="relative hidden min-h-dvh flex-col overflow-hidden bg-[#17543e] p-12 text-white lg:flex xl:p-16">
                <div className="pointer-events-none absolute -top-48 -right-48 size-[650px] rounded-full border border-white/8" />
                <div className="pointer-events-none absolute -right-64 -bottom-80 size-[850px] rounded-full border-[80px] border-white/3" />
                <div className="relative flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl border border-white/20 bg-white/8">
                        <AppLogoIcon className="size-8" />
                    </span>
                    <div>
                        <p className="text-lg font-semibold tracking-tight">
                            NEU Health Portal
                        </p>
                        <p className="mt-1 text-[10px] tracking-[0.14em] text-white/55 uppercase">
                            New Era University
                        </p>
                    </div>
                </div>
                <div className="relative my-auto max-w-[440px] py-16">
                    <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] tracking-wider text-white/75 uppercase">
                        <span className="size-1.5 rounded-full bg-[#b4d6a6]" />A
                        healthier campus starts here
                    </span>
                    <h2 className="text-[42px] leading-[1.2] font-medium tracking-[-0.035em] xl:text-[50px]">
                        Thoughtful care.
                        <br />
                        <span className="text-[#c0d9bd]">
                            A smoother
                            <br />
                            campus experience.
                        </span>
                    </h2>
                    <p className="mt-6 max-w-sm text-sm leading-7 text-white/60">
                        A connected workspace for your clinic team, so you can
                        spend less time organizing and more time caring.
                    </p>
                    <div className="mt-10 space-y-5">
                        {[
                            [CalendarCheck2, 'A well-planned clinic day'],
                            [ShieldCheck, 'Clear enrollment requirements'],
                            [
                                HeartHandshake,
                                'Every student, thoughtfully supported',
                            ],
                        ].map(([Icon, label]) => {
                            const Symbol = Icon as typeof ShieldCheck;
                            return (
                                <div
                                    key={String(label)}
                                    className="flex items-center gap-3 text-xs text-white/80"
                                >
                                    <span className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                                        <Symbol
                                            className="size-4 text-[#b7d5b2]"
                                            strokeWidth={1.5}
                                        />
                                    </span>
                                    {String(label)}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="relative flex items-center justify-between border-t border-white/10 pt-6 text-[10px] tracking-wide text-white/40">
                    <span>NEU UNIVERSITY CLINIC</span>
                    <span>Care. Connect. Continue.</span>
                </div>
            </aside>
            <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 sm:px-12">
                <div className="w-full max-w-[380px]">
                    <div className="mb-10 flex items-center gap-2 text-primary lg:hidden">
                        <AppLogoIcon className="size-9" />
                        <span className="font-semibold">NEU Health Portal</span>
                    </div>
                    <div className="mb-8">
                        <p className="mb-3 text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
                            Staff workspace
                        </p>
                        <h1 className="text-[28px] font-semibold tracking-tight">
                            {title}
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                    <p className="mt-10 text-center text-[10px] leading-5 text-muted-foreground">
                        New Era University · Health Portal
                        <br />
                        Supporting a healthier campus community.
                    </p>
                </div>
            </main>
        </div>
    );
}
