import { useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    CalendarRange,
    ClipboardCheck,
    HeartPulse,
    LayoutGrid,
    Megaphone,
    ShieldCheck,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as announcements } from '@/routes/announcements';
import { index as appointments } from '@/routes/appointments';
import { index as clearances } from '@/routes/clearances';
import { index as schedules } from '@/routes/schedules';
import { index as students } from '@/routes/students';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const page = usePage();
    const clinic = page.props.auth.user.role === 'clinic';
    const { setOpenMobile } = useSidebar();
    useEffect(() => setOpenMobile(false), [page.url, setOpenMobile]);
    const items: NavItem[] = clinic
        ? [
              { title: 'Overview', href: dashboard(), icon: LayoutGrid },
              {
                  title: 'Appointments',
                  href: appointments(),
                  icon: CalendarDays,
              },
              { title: 'Student records', href: students(), icon: Users },
              {
                  title: 'Medical clearances',
                  href: clearances(),
                  icon: ClipboardCheck,
              },
              {
                  title: 'Clinic schedule',
                  href: schedules(),
                  icon: CalendarRange,
              },
              {
                  title: 'Announcements',
                  href: announcements(),
                  icon: Megaphone,
              },
          ]
        : [
              { title: 'Overview', href: dashboard(), icon: LayoutGrid },
              {
                  title: 'Medical clearances',
                  href: clearances(),
                  icon: ShieldCheck,
              },
          ];
    return (
        <Sidebar
            collapsible="icon"
            variant="sidebar"
            className="border-r border-sidebar-border"
        >
            <SidebarHeader className="px-4 py-6">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="hover:bg-transparent"
                        >
                            <Link href={dashboard()}>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className="px-2 pt-3">
                <p className="mb-1 px-5 text-[9px] font-semibold tracking-[0.18em] text-muted-foreground uppercase group-data-[collapsible=icon]:hidden">
                    {clinic ? 'Clinic workspace' : 'Registrar workspace'}
                </p>
                <NavMain items={items} />
            </SidebarContent>
            <SidebarFooter className="gap-4 p-4">
                <div className="rounded-xl border border-primary/10 bg-primary/4 p-4 group-data-[collapsible=icon]:hidden">
                    <HeartPulse
                        className="mb-3 size-5 text-primary"
                        strokeWidth={1.6}
                    />
                    <p className="text-xs font-semibold">
                        Care for your campus.
                    </p>
                    <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
                        A simpler clinic experience for every NEU student.
                    </p>
                </div>
                <div className="border-t pt-3">
                    <NavUser />
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
