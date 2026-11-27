import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { Monitor, ShieldCheck, UserRound } from 'lucide-react';
import { PageHeading } from '@/components/clinic-ui';
import { Button } from '@/components/ui/button';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: edit(),
        icon: UserRound,
    },
    {
        title: 'Security',
        href: editSecurity(),
        icon: ShieldCheck,
    },
    {
        title: 'Appearance',
        href: editAppearance(),
        icon: Monitor,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="clinic-page">
            <PageHeading
                title="Settings"
                description="Manage your profile, sign-in security, and display preferences."
            />

            <div className="grid items-start gap-5 lg:grid-cols-[12rem_minmax(0,1fr)]">
                <aside className="panel p-2">
                    <nav
                        className="flex flex-wrap gap-1 lg:flex-col"
                        aria-label="Settings"
                    >
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${toUrl(item.href)}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('h-10 justify-start lg:w-full', {
                                    'bg-accent text-accent-foreground':
                                        isCurrentOrParentUrl(item.href),
                                })}
                            >
                                <Link
                                    href={item.href}
                                    aria-current={
                                        isCurrentOrParentUrl(item.href)
                                            ? 'page'
                                            : undefined
                                    }
                                >
                                    {item.icon && (
                                        <item.icon className="h-4 w-4" />
                                    )}
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <section className="panel min-w-0 space-y-8 p-5 sm:p-7">
                    {children}
                </section>
            </div>
        </div>
    );
}
