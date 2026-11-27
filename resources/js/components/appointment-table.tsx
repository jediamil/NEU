import { Link } from '@inertiajs/react';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    dateLabel,
    EmptyState,
    StatusBadge,
    StudentAvatar,
    timeLabel,
} from '@/components/clinic-ui';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { index } from '@/routes/appointments';
import type { Appointment } from '@/types/clinic';

function AppointmentTiming({
    appointment,
    compact,
}: {
    appointment: Appointment;
    compact: boolean;
}) {
    const startTime = timeLabel(appointment.starts_at);
    const period = appointment.period === 'morning' ? 'Morning' : 'Afternoon';

    if (compact) {
        return (
            <p className="text-xs whitespace-nowrap">
                {appointment.legacy_time ? startTime : period}
            </p>
        );
    }

    return (
        <>
            <p className="text-sm">{dateLabel(appointment.starts_at)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
                {appointment.legacy_time
                    ? `${startTime} (existing time)`
                    : `${period} · ${startTime}–${timeLabel(appointment.ends_at)}`}
            </p>
        </>
    );
}

export function AppointmentTable({
    appointments,
    actions,
    compact = false,
    showStudent = true,
}: {
    appointments: Appointment[];
    actions?: (appointment: Appointment) => ReactNode;
    compact?: boolean;
    showStudent?: boolean;
}) {
    if (!appointments.length) {
        return (
            <EmptyState
                icon={CalendarDays}
                title="No appointments to show"
                description="Appointments will appear here as clinic visits are scheduled."
            />
        );
    }

    const showActions = showStudent || Boolean(actions);
    const timingColumnClass = showStudent ? undefined : 'hidden @lg:table-cell';
    const statusColumnClass = showStudent
        ? undefined
        : 'w-px text-right @lg:w-36 @lg:text-left';

    return (
        <div className="@container overflow-x-auto">
            <table className="clinic-table">
                <thead>
                    <tr>
                        {showStudent && <th scope="col">Student</th>}
                        <th
                            scope="col"
                            className={showStudent ? undefined : '@lg:w-1/2'}
                        >
                            {showStudent ? 'Services' : 'Clinic service'}
                        </th>
                        <th scope="col" className={timingColumnClass}>
                            {compact ? 'Time' : 'Date & time'}
                        </th>
                        <th scope="col" className={statusColumnClass}>
                            Status
                        </th>
                        {showActions && (
                            <th scope="col">
                                <span className="sr-only">Actions</span>
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {appointments.map((appointment, indexInTable) => {
                        const appointmentLink = index({
                            query: { search: appointment.reference },
                        });
                        const timing = (
                            <AppointmentTiming
                                appointment={appointment}
                                compact={compact}
                            />
                        );

                        return (
                            <tr key={appointment.id}>
                                {showStudent && (
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <StudentAvatar
                                                name={appointment.student.name}
                                                index={indexInTable}
                                            />
                                            <div>
                                                <p className="font-medium">
                                                    {appointment.student.name}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {
                                                        appointment.student
                                                            .student_number
                                                    }
                                                    <span className="mt-1 block">
                                                        {
                                                            appointment.student
                                                                .program
                                                        }{' '}
                                                        · Year{' '}
                                                        {
                                                            appointment.student
                                                                .year_level
                                                        }
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                )}
                                <td>
                                    {showActions ? (
                                        <p className="text-xs">
                                            {appointment.service_label}
                                        </p>
                                    ) : (
                                        <TextLink
                                            href={appointmentLink}
                                            className="inline-flex items-center gap-1.5 font-semibold text-primary"
                                            aria-label={`View ${appointment.service_label} appointment ${appointment.reference}`}
                                        >
                                            <span className="wrap-anywhere">
                                                {appointment.service_label}
                                            </span>
                                            <ArrowUpRight
                                                className="size-3.5 shrink-0"
                                                aria-hidden="true"
                                            />
                                        </TextLink>
                                    )}
                                    <p className="mt-1 text-xs wrap-anywhere text-muted-foreground">
                                        {appointment.reference}
                                    </p>
                                    {!showStudent && (
                                        <div className="mt-2 @lg:hidden">
                                            {timing}
                                        </div>
                                    )}
                                </td>
                                <td className={timingColumnClass}>{timing}</td>
                                <td
                                    className={
                                        showStudent
                                            ? undefined
                                            : 'text-right align-top @lg:text-left @lg:align-middle'
                                    }
                                >
                                    <StatusBadge status={appointment.status} />
                                </td>
                                {showActions && (
                                    <td className="text-right">
                                        {actions ? (
                                            actions(appointment)
                                        ) : (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                asChild
                                            >
                                                <Link
                                                    href={appointmentLink}
                                                    aria-label={`View appointment for ${appointment.student.name}`}
                                                >
                                                    <ArrowUpRight className="size-4" />
                                                </Link>
                                            </Button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
