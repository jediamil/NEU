import { useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    CalendarRange,
    ListChecks,
    ClipboardCheck,
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
import { index as scheduledStudents } from '@/routes/scheduled-students';
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
                  title: 'Scheduled students',
                  href: scheduledStudents(),
                  icon: ListChecks,
              },
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
            <SidebarHeader className="border-b border-sidebar-border px-4 py-4 group-data-[collapsible=icon]:px-2">
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
            <SidebarContent className="px-2 pt-5">
                <p className="mb-2 px-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase group-data-[collapsible=icon]:hidden">
                    {clinic ? 'Clinic workspace' : 'Registrar workspace'}
                </p>
                <NavMain items={items} />
            </SidebarContent>
            <SidebarFooter className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:p-2">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
