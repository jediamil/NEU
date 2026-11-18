import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Circle,
    GraduationCap,
    Mail,
    Pencil,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { AppointmentTable } from '@/components/appointment-table';
import {
    PageHeading,
    SectionHeading,
    StatusBadge,
    StudentAvatar,
} from '@/components/clinic-ui';
import { StudentDialog } from '@/components/student-dialog';
import { Button } from '@/components/ui/button';
import { index as clearances } from '@/routes/clearances';
import { index } from '@/routes/students';
import type { Appointment, Student } from '@/types/clinic';

export default function StudentProfile({
    student,
    appointments,
}: {
    student: Student;
    appointments: Appointment[];
}) {
    const [editing, setEditing] = useState(false);
    return (
        <>
            <Head title={student.name} />
            <div className="clinic-page">
                <Link
                    href={index()}
                    className="flex w-fit items-center gap-2 text-xs text-muted-foreground hover:text-primary"
                >
                    <ArrowLeft className="size-3.5" />
                    Back to student records
                </Link>
                <PageHeading
                    eyebrow="STUDENT PROFILE"
                    title={student.name}
                    description={
                        student.student_number + ' · ' + student.program
                    }
                >
                    <Button variant="outline" onClick={() => setEditing(true)}>
                        <Pencil className="size-3.5" />
                        Edit record
                    </Button>
                </PageHeading>
                <div className="grid items-start gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
                    <div className="space-y-5">
                        <section className="panel p-6">
                            <div className="mb-5 flex items-center gap-3">
                                <StudentAvatar name={student.name} />
                                <div>
                                    <h2 className="text-sm font-semibold">
                                        {student.name}
                                    </h2>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {student.student_number}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-4 text-xs">
                                <div className="flex items-start gap-3">
                                    <GraduationCap className="size-4 shrink-0 text-muted-foreground" />
                                    <div>
                                        <p>{student.program}</p>
                                        <p className="mt-1 text-muted-foreground">
                                            Year {student.year_level}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail className="size-4 shrink-0 text-muted-foreground" />
                                    <span className="break-all">
                                        {student.email ?? 'Email not provided'}
                                    </span>
                                </div>
                            </div>
                        </section>
                        <section className="panel">
                            <SectionHeading title="Medical clearance">
                                <ShieldCheck className="size-4 text-primary" />
                            </SectionHeading>
                            <div className="space-y-4 px-5 pb-5">
                                <StatusBadge
                                    status={
                                        student.clearance?.status ?? 'pending'
                                    }
                                />
                                {(
                                    [
                                        [
                                            'physical_exam',
                                            'Physical examination',
                                        ],
                                        [
                                            'documents_received',
                                            'Medical documents',
                                        ],
                                        ['xray_verified', 'X-ray verification'],
                                    ] as const
                                ).map(([key, label]) => (
                                    <div
                                        key={key}
                                        className="flex items-center gap-2 text-xs"
                                    >
                                        {student.clearance?.[key] ? (
                                            <CheckCircle2 className="size-4 text-primary" />
                                        ) : (
                                            <Circle className="size-4 text-muted-foreground/50" />
                                        )}
                                        {label}
                                    </div>
                                ))}
                                {student.clearance?.notes && (
                                    <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
                                        {student.clearance.notes}
                                    </p>
                                )}
                                <Button
                                    asChild
                                    className="w-full"
                                    variant="outline"
                                >
                                    <Link
                                        href={clearances({
                                            query: {
                                                search: student.student_number,
                                            },
                                        })}
                                    >
                                        Review clearance
                                        <ArrowRight className="size-3.5" />
                                    </Link>
                                </Button>
                            </div>
                        </section>
                    </div>
                    <section className="panel min-w-0">
                        <SectionHeading
                            title="Appointment history"
                            description="A record of this student’s clinic visits"
                        />
                        <AppointmentTable appointments={appointments} />
                    </section>
                </div>
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
