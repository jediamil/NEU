import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowRight,
    CalendarDays,
    CheckCheck,
    ClipboardCheck,
    Clock3,
    Megaphone,
    Plus,
    ShieldCheck,
    Stethoscope,
    Users,
} from 'lucide-react';
import { AppointmentTable } from '@/components/appointment-table';
import {
    dateLabel,
    EmptyState,
    PageHeading,
    SectionHeading,
    StatCard,
} from '@/components/clinic-ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index as announcementIndex } from '@/routes/announcements';
import { index as appointmentIndex } from '@/routes/appointments';
import { index as clearanceIndex } from '@/routes/clearances';
import { index as scheduleIndex } from '@/routes/schedules';
import type { Announcement, Appointment } from '@/types/clinic';

type Props = {
    today: string;
    stats: {
        appointments: number;
        checked_in: number;
        pending_clearances: number;
        remaining_capacity: number;
        students: number;
        cleared: number;
    };
    appointments: Appointment[];
    week: {
        label: string;
        date: string;
        booked: number;
        capacity: number;
        is_today: boolean;
    }[];
    announcements: Announcement[];
    clearance_breakdown: {
        cleared: number;
        pending: number;
        incomplete: number;
    };
};
export default function Dashboard({
    today,
    stats,
    appointments,
    week,
    announcements,
    clearance_breakdown: clearance,
}: Props) {
    const { auth } = usePage().props;
    const clinic = auth.user.role === 'clinic';
    const total = clearance.cleared + clearance.pending + clearance.incomplete;
    return (
        <>
            <Head title="Clinic overview" />
            <div className="clinic-page">
                <PageHeading
                    title={clinic ? 'Clinic overview' : 'Registrar overview'}
                    description={
                        clinic
                            ? 'Review today’s appointments, clinic capacity, and clearance activity.'
                            : 'Look up student medical clearance status for enrollment.'
                    }
                >
                    <span className="mr-2 hidden items-center gap-2 text-xs text-muted-foreground xl:flex">
                        <CalendarDays className="size-3.5" />
                        {today}
                    </span>
                    {clinic && (
                        <Button asChild>
                            <Link
                                href={appointmentIndex({ query: { new: 1 } })}
                            >
                                <Plus className="size-4" />
                                New appointment
                            </Link>
                        </Button>
                    )}
                </PageHeading>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label={
                            clinic ? 'Appointments today' : 'Students on record'
                        }
                        value={clinic ? stats.appointments : stats.students}
                        caption={
                            clinic
                                ? 'Across all clinic transaction types'
                                : 'Available for clearance verification'
                        }
                        icon={clinic ? CalendarDays : Users}
                    />
                    <StatCard
                        label={
                            clinic ? 'Currently checked in' : 'Students cleared'
                        }
                        value={clinic ? stats.checked_in : stats.cleared}
                        caption={
                            clinic
                                ? 'Students ready for their clinic visit'
                                : 'Ready for enrollment verification'
                        }
                        icon={clinic ? Stethoscope : ShieldCheck}
                        tone="blue"
                    />
                    <StatCard
                        label="Awaiting clearance"
                        value={stats.pending_clearances}
                        caption="Pending or incomplete requirements"
                        icon={ClipboardCheck}
                        tone="amber"
                    />
                    <StatCard
                        label={
                            clinic
                                ? 'Remaining daily capacity'
                                : 'Clearance completion'
                        }
                        value={
                            clinic
                                ? stats.remaining_capacity
                                : total
                                  ? Math.round((stats.cleared / total) * 100)
                                  : 0
                        }
                        caption={
                            clinic
                                ? 'Reservations still available today'
                                : 'Percentage of students cleared'
                        }
                        icon={clinic ? Clock3 : CheckCheck}
                        tone="violet"
                    />
                </div>
                {clinic && (
                    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                        <section className="panel min-w-0">
                            <SectionHeading
                                title="Today’s appointments"
                                description="Review student arrivals and appointment status."
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    className="text-primary"
                                >
                                    <Link href={appointmentIndex()}>
                                        View all
                                        <ArrowRight className="size-3.5" />
                                    </Link>
                                </Button>
                            </SectionHeading>
                            <AppointmentTable
                                appointments={appointments}
                                compact
                            />
                            <div className="flex items-center gap-2 border-t px-5 py-3 text-[10px] text-muted-foreground">
                                <span className="size-1.5 rounded-full bg-primary" />
                                Appointment information reflects the latest
                                saved records.
                            </div>
                        </section>
                        <section className="panel">
                            <SectionHeading
                                title="Clinic capacity"
                                description="Appointments reserved this week"
                            >
                                <CalendarDays className="size-4 text-muted-foreground" />
                            </SectionHeading>
                            <div className="space-y-4 px-5 pb-5">
                                {week.length ? (
                                    week.map((day) => (
                                        <div
                                            key={day.date}
                                            className="grid grid-cols-[34px_1fr_38px] items-center gap-3"
                                        >
                                            <span
                                                className={cn(
                                                    'text-[11px]',
                                                    day.is_today
                                                        ? 'font-semibold text-primary'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                {day.label}
                                            </span>
                                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className={cn(
                                                        'h-full rounded-full',
                                                        day.is_today
                                                            ? 'bg-primary'
                                                            : 'bg-primary/30',
                                                    )}
                                                    style={{
                                                        width:
                                                            Math.min(
                                                                100,
                                                                day.capacity
                                                                    ? (day.booked /
                                                                          day.capacity) *
                                                                          100
                                                                    : 0,
                                                            ) + '%',
                                                    }}
                                                />
                                            </div>
                                            <span className="text-right text-[10px] text-muted-foreground tabular-nums">
                                                {day.booked}/{day.capacity}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <EmptyState
                                        title="No clinic hours yet"
                                        description="Create a schedule to see availability."
                                    />
                                )}
                            </div>
                            <div className="border-t px-5 py-4">
                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-full text-xs"
                                >
                                    <Link href={scheduleIndex()}>
                                        Manage clinic schedule
                                        <ArrowRight className="size-3.5" />
                                    </Link>
                                </Button>
                            </div>
                        </section>
                    </div>
                )}
                <div
                    className={cn(
                        'grid items-start gap-5',
                        clinic
                            ? 'xl:grid-cols-[minmax(0,1fr)_300px]'
                            : 'xl:grid-cols-2',
                    )}
                >
                    {clinic && (
                        <section className="panel">
                            <SectionHeading
                                title="Clinic announcements"
                                description="The latest updates for your campus community"
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    className="text-primary"
                                >
                                    <Link href={announcementIndex()}>
                                        Manage
                                        <ArrowRight className="size-3.5" />
                                    </Link>
                                </Button>
                            </SectionHeading>
                            <div className="divide-y">
                                {announcements.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={announcementIndex({
                                            query: { search: item.title },
                                        })}
                                        className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-muted/40"
                                    >
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/7 text-primary">
                                            <Megaphone
                                                className="size-4"
                                                strokeWidth={1.6}
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-xs font-medium">
                                                {item.title}
                                            </h3>
                                            <p className="mt-1 line-clamp-1 text-[11px] leading-relaxed text-muted-foreground">
                                                {item.body}
                                            </p>
                                            <p className="mt-2 text-[10px] text-muted-foreground">
                                                {dateLabel(item.published_at!)}
                                                <span className="mx-2">·</span>
                                                Students
                                            </p>
                                        </div>
                                        <ArrowDownRight className="mt-1 size-3.5 text-muted-foreground" />
                                    </Link>
                                ))}
                                {!announcements.length && (
                                    <EmptyState
                                        title="No announcements yet"
                                        description="Publish a notice to keep students informed."
                                    />
                                )}
                            </div>
                        </section>
                    )}
                    <section className="panel">
                        <SectionHeading
                            title="Enrollment clearance"
                            description="Medical clearance totals by status"
                        >
                            <ShieldCheck className="size-4 text-primary" />
                        </SectionHeading>
                        <div className="px-5 pb-5">
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-semibold tracking-tight">
                                    {clearance.cleared}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    of {total} students cleared
                                </span>
                            </div>
                            <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-muted">
                                {Object.entries(clearance).map(
                                    ([status, value]) => (
                                        <div
                                            key={status}
                                            className={
                                                status === 'cleared'
                                                    ? 'bg-primary'
                                                    : status === 'incomplete'
                                                      ? 'bg-amber-400'
                                                      : 'bg-muted-foreground/20'
                                            }
                                            style={{
                                                width:
                                                    (total
                                                        ? (value / total) * 100
                                                        : 0) + '%',
                                            }}
                                        />
                                    ),
                                )}
                            </div>
                            <div className="mt-5 space-y-3">
                                {[
                                    [
                                        'Cleared',
                                        clearance.cleared,
                                        'bg-primary',
                                    ],
                                    [
                                        'Pending',
                                        clearance.pending,
                                        'bg-muted-foreground/30',
                                    ],
                                    [
                                        'Incomplete',
                                        clearance.incomplete,
                                        'bg-amber-400',
                                    ],
                                ].map(([label, value, color]) => (
                                    <div
                                        key={label}
                                        className="flex items-center justify-between text-xs"
                                    >
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <span
                                                className={cn(
                                                    'size-2 rounded-full',
                                                    color,
                                                )}
                                            />
                                            {label}
                                        </span>
                                        <span className="font-medium tabular-nums">
                                            {value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <Button
                                asChild
                                variant="outline"
                                className="mt-5 w-full text-xs"
                            >
                                <Link href={clearanceIndex()}>
                                    View medical clearances
                                    <ArrowRight className="size-3.5" />
                                </Link>
                            </Button>
                        </div>
                    </section>
                </div>
                <p className="text-[10px] text-muted-foreground">
                    NEW ERA UNIVERSITY <span className="mx-2">/</span> A
                    healthier campus, one visit at a time.
                </p>
            </div>
        </>
    );
}
Dashboard.layout = { breadcrumbs: [{ title: 'Overview', href: dashboard() }] };
