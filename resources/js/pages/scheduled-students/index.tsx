import { Head, Link } from '@inertiajs/react';
import { CalendarDays, Clock3, Users } from 'lucide-react';
import { AppointmentTable } from '@/components/appointment-table';
import {
    dateLabel,
    PageHeading,
    Pagination,
    SearchFilters,
    StatCard,
} from '@/components/clinic-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { index } from '@/routes/scheduled-students';
import { show as studentShow } from '@/routes/students';
import type { Appointment, Paginated } from '@/types/clinic';

export default function ScheduledStudents({
    appointments,
    filters,
    capacity,
}: {
    appointments: Paginated<Appointment>;
    filters: Record<string, string>;
    capacity: {
        is_open: boolean;
        morning: number;
        afternoon: number;
        daily: number;
        morning_reserved: number;
        afternoon_reserved: number;
    } | null;
}) {
    return (
        <>
            <Head title="Scheduled students" />
            <div className="clinic-page">
                <PageHeading
                    title="Scheduled students"
                    description={
                        'Students booked for ' +
                        dateLabel(filters.date) +
                        '. Choose a date and booking period to prepare for their visits.'
                    }
                />
                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Morning"
                        value={capacity?.morning_reserved ?? 0}
                        caption={
                            '8:00 AM–12:00 PM · Capacity ' +
                            (capacity?.morning ?? 0)
                        }
                        icon={Clock3}
                    />
                    <StatCard
                        label="Afternoon"
                        value={capacity?.afternoon_reserved ?? 0}
                        caption={
                            '1:00–4:00 PM · Capacity ' +
                            (capacity?.afternoon ?? 0)
                        }
                        icon={CalendarDays}
                        tone="blue"
                    />
                    <StatCard
                        label="Whole day"
                        value={
                            (capacity?.morning_reserved ?? 0) +
                            (capacity?.afternoon_reserved ?? 0)
                        }
                        caption={
                            'Shared daily maximum · ' + (capacity?.daily ?? 0)
                        }
                        icon={Users}
                        tone="amber"
                    />
                </div>
                {(!capacity || !capacity.is_open) && (
                    <p className="rounded-xl border bg-muted/40 p-4 text-xs text-muted-foreground">
                        {capacity
                            ? 'This clinic day is closed to new bookings. Existing appointments are shown below.'
                            : 'No clinic schedule has been created for this date.'}
                    </p>
                )}
                <section className="panel">
                    <SearchFilters
                        key={
                            filters.date +
                            filters.period +
                            (filters.status ?? '')
                        }
                        url={index.url()}
                        filters={filters}
                        placeholder="Search student name, number, or reference..."
                    >
                        <Input
                            type="date"
                            name="date"
                            defaultValue={filters.date}
                            aria-label="Roster date"
                            className="h-10 w-auto"
                            required
                        />
                        <select
                            name="period"
                            defaultValue={filters.period}
                            aria-label="Booking period"
                            className="field-input w-auto"
                        >
                            <option value="all">Whole day</option>
                            <option value="morning">
                                Morning · 8 AM–12 PM
                            </option>
                            <option value="afternoon">
                                Afternoon · 1–4 PM
                            </option>
                        </select>
                        <select
                            name="status"
                            defaultValue={filters.status ?? ''}
                            aria-label="Appointment status"
                            className="field-input w-auto"
                        >
                            <option value="">All non-cancelled</option>
                            {[
                                'scheduled',
                                'checked_in',
                                'completed',
                                'no_show',
                                'cancelled',
                            ].map((status) => (
                                <option key={status} value={status}>
                                    {status.replace('_', ' ')}
                                </option>
                            ))}
                        </select>
                    </SearchFilters>
                    <AppointmentTable
                        appointments={appointments.data}
                        actions={(appointment) => (
                            <Button asChild variant="outline" size="sm">
                                <Link
                                    href={studentShow(appointment.student.id)}
                                >
                                    Student record
                                </Link>
                            </Button>
                        )}
                    />
                    <Pagination data={appointments} />
                </section>
            </div>
        </>
    );
}
ScheduledStudents.layout = {
    breadcrumbs: [{ title: 'Scheduled students', href: index() }],
};
