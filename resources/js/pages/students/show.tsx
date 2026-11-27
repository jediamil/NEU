import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { useState } from 'react';
import { AppointmentTable } from '@/components/appointment-table';
import { ClearanceHistory } from '@/components/clearance-history';
import { SectionHeading, StatusBadge } from '@/components/clinic-ui';
import { StudentDialog } from '@/components/student-dialog';
import { StudentRecordHeading } from '@/components/student-record-heading';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { show as clearanceShow } from '@/routes/clearances';
import { index } from '@/routes/students';
import type { Appointment, ClearanceRecord, Student } from '@/types/clinic';

const clearanceRequirements = [
    ['physical_exam', 'Physical examination'],
    ['documents_received', 'Medical documents'],
    ['xray_verified', 'X-ray verification'],
] as const;

export default function StudentProfile({
    student,
    appointments,
    clearance_history,
    active_school_year,
}: {
    student: Student;
    appointments: Appointment[];
    clearance_history: ClearanceRecord[];
    active_school_year: string;
}) {
    const [editing, setEditing] = useState(false);
    const clearance = student.clearance;
    const studentDetails = [
        ['Age', student.age ?? 'Not provided', 'col-span-2'],
        ['Year', student.year_level, 'col-span-2'],
        ['Section', student.section ?? 'Not provided', 'col-span-2'],
        ['Course', student.program, 'col-span-3'],
        ['College', student.college ?? 'Not provided', 'col-span-3'],
        ['Email', student.email ?? 'Not provided', 'col-span-6'],
    ];

    return (
        <>
            <Head title={student.name} />
            <div className="clinic-page @container gap-5">
                <Link
                    href={index()}
                    className="flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
                >
                    <ArrowLeft className="size-4" />
                    Back to student records
                </Link>
                <div className="grid gap-5 @3xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                    <StudentRecordHeading
                        student={student}
                        onEdit={() => setEditing(true)}
                    >
                        <dl className="grid flex-1 grid-cols-6 content-center gap-x-4 gap-y-3 border-t bg-muted/25 px-4 py-4 sm:px-5 @lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.8fr)_minmax(0,1.35fr)]">
                            {studentDetails.map(([label, value, span]) => (
                                <div
                                    key={label}
                                    className={cn(
                                        'min-w-0 @lg:col-span-1',
                                        span,
                                    )}
                                >
                                    <dt className="text-xs font-medium text-muted-foreground">
                                        {label}
                                    </dt>
                                    <dd className="mt-1 text-sm wrap-anywhere">
                                        {value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </StudentRecordHeading>

                    <section
                        className="panel flex min-w-0 flex-col"
                        aria-labelledby="current-clearance-heading"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2
                                        id="current-clearance-heading"
                                        className="text-base font-semibold"
                                    >
                                        Medical clearance
                                    </h2>
                                    <StatusBadge
                                        status={clearance?.status ?? 'pending'}
                                    />
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    School year {active_school_year}
                                </p>
                            </div>
                            <Button asChild variant="secondary">
                                <Link href={clearanceShow(student.id)}>
                                    Review clearance
                                    <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                        </div>
                        <ul className="grid flex-1 content-center gap-2.5 border-t bg-muted/25 px-4 py-4 sm:px-5">
                            {clearanceRequirements.map(([key, label]) => {
                                const complete = clearance?.[key];
                                const Icon = complete ? CheckCircle2 : Circle;

                                return (
                                    <li
                                        key={key}
                                        className="flex items-center justify-between gap-3"
                                    >
                                        <span className="flex items-center gap-2 text-sm">
                                            <Icon
                                                aria-hidden="true"
                                                className={
                                                    complete
                                                        ? 'size-4 shrink-0 text-primary'
                                                        : 'size-4 shrink-0 text-muted-foreground'
                                                }
                                            />
                                            {label}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {complete ? 'Complete' : 'Pending'}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                        {clearance?.notes && (
                            <div className="border-t px-4 py-3 sm:px-5">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Clearance notes
                                </p>
                                <p className="mt-1 text-sm wrap-anywhere whitespace-pre-wrap">
                                    {clearance.notes}
                                </p>
                            </div>
                        )}
                    </section>
                </div>

                <section className="panel min-w-0">
                    <SectionHeading title="Appointment history" />
                    <AppointmentTable
                        appointments={appointments}
                        showStudent={false}
                    />
                </section>
                <ClearanceHistory
                    studentId={student.id}
                    records={clearance_history}
                />
            </div>
            {editing && (
                <StudentDialog
                    student={student}
                    onClose={() => setEditing(false)}
                />
            )}
        </>
    );
}

StudentProfile.layout = {
    breadcrumbs: [
        { title: 'Student records', href: index() },
        { title: 'Student profile' },
    ],
};
