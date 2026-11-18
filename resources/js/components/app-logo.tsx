import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <AppLogoIcon className="size-6" />
            </div>
            <div className="ml-1 grid flex-1 text-left">
                <span className="text-[14px] leading-tight font-semibold tracking-tight">
                    NEU Health
                    <span className="font-normal text-primary"> Portal</span>
                </span>
                <span className="mt-1 text-[9px] tracking-[0.1em] text-muted-foreground uppercase">
                    New Era University
                </span>
            </div>
        </>
    );
}
