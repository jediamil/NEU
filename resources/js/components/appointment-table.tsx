import { Link } from '@inertiajs/react';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    EmptyState,
    StatusBadge,
    StudentAvatar,
    dateLabel,
    timeLabel,
} from '@/components/clinic-ui';
import { Button } from '@/components/ui/button';
import { index } from '@/routes/appointments';
import type { Appointment } from '@/types/clinic';

export function AppointmentTable({
    appointments,
    actions,
    compact = false,
}: {
    appointments: Appointment[];
    actions?: (appointment: Appointment) => ReactNode;
    compact?: boolean;
}) {
    if (!appointments.length)
        return (
            <EmptyState
                icon={CalendarDays}
                title="No appointments to show"
                description="Appointments will appear here as clinic visits are scheduled."
            />
        );
    return (
        <div className="overflow-x-auto">
            <table className="clinic-table">
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Transaction</th>
                        <th>{compact ? 'Time' : 'Date & time'}</th>
                        <th>Status</th>
                        <th>
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {appointments.map((appointment, i) => (
                        <tr key={appointment.id}>
                            <td>
                                <div className="flex items-center gap-3">
                                    <StudentAvatar
                                        name={appointment.student.name}
                                        index={i}
                                    />
                                    <div>
                                        <div className="font-medium">
                                            {appointment.student.name}
                                        </div>
                                        <div className="mt-1 text-[10px] text-muted-foreground">
                                            {appointment.student.student_number}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div className="text-xs">
                                    {appointment.service_label}
                                </div>
                                <div className="mt-1 text-[10px] text-muted-foreground">
                                    {appointment.reference}
                                </div>
                            </td>
                            <td>
                                <div className="text-xs whitespace-nowrap">
                                    {compact
                                        ? timeLabel(appointment.starts_at)
                                        : dateLabel(appointment.starts_at)}
                                </div>
                                {!compact && (
                                    <div className="mt-1 text-[10px] text-muted-foreground">
                                        {timeLabel(appointment.starts_at)}
                                    </div>
                                )}
                            </td>
                            <td>
                                <StatusBadge status={appointment.status} />
                            </td>
                            <td className="text-right">
                                {actions ? (
                                    actions(appointment)
                                ) : (
                                    <Button size="icon" variant="ghost" asChild>
                                        <Link
                                            href={index({
                                                query: {
                                                    search: appointment.reference,
                                                },
                                            })}
                                            aria-label={
                                                'View appointment for ' +
                                                appointment.student.name
                                            }
                                        >
                                            <ArrowUpRight className="size-4" />
                                        </Link>
                                    </Button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
