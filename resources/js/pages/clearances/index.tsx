import { Head, Link, usePage } from '@inertiajs/react';
import {
    Check,
    ClipboardCheck,
    LockKeyhole,
    Search,
    ShieldCheck,
} from 'lucide-react';
import {
    dateLabel,
    EmptyState,
    PageHeading,
    Pagination,
    SearchFilters,
    StatCard,
    StatusBadge,
    StudentAvatar,
} from '@/components/clinic-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import InputError from '@/components/input-error';
import { index, show } from '@/routes/clearances';
import type { Paginated, Student } from '@/types/clinic';

export default function Clearances({
    students,
    filters,
    counts,
}: {
    students: Paginated<Student>;
    filters: Record<string, string>;
    counts: {
        all: number;
        pending: number;
        incomplete: number;
        cleared: number;
    };
}) {
    const { auth, errors } = usePage().props;
    const clinic = auth.user.role === 'clinic';
    return (
        <>
            <Head title="Medical clearances" />
            <div className="clinic-page">
                <PageHeading
                    title="Medical clearances"
                    description={
                        clinic
                            ? 'Review screening requirements and update medical clearance for enrollment.'
                            : 'Look up student medical clearance status for enrollment verification.'
                    }
                >
                    {!clinic && (
                        <span className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
                            <LockKeyhole className="size-3.5" />
                            Registrar · Read-only
                        </span>
                    )}
                </PageHeading>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Total students"
                        value={counts.all}
                        caption="Students with enrollment records"
                        icon={ClipboardCheck}
                    />
                    <StatCard
                        label="Cleared for enrollment"
                        value={counts.cleared}
                        caption="All required items verified"
                        icon={ShieldCheck}
                        tone="blue"
                    />
                    <StatCard
                        label="Pending review"
                        value={counts.pending}
                        caption="Waiting for clinic review"
                        icon={Search}
                        tone="amber"
                    />
                    <StatCard
                        label="Incomplete requirements"
                        value={counts.incomplete}
                        caption="Students with items to follow up"
                        icon={ClipboardCheck}
                        tone="violet"
                    />
                </div>
                <section className="panel">
                    {errors.school_year && (
                        <div className="px-4 pt-4">
                            <InputError message={errors.school_year} />
                        </div>
                    )}
                    <SearchFilters
                        url={index.url()}
                        filters={filters}
                        placeholder="Search student name or number..."
                    >
                        <Input
                            name="school_year"
                            aria-label="School year"
                            defaultValue={filters.school_year}
                            placeholder="2026-2027"
                            pattern="[0-9]{4}-[0-9]{4}"
                            className="h-10 w-36"
                            required
                        />
                        <select
                            name="status"
                            defaultValue={filters.status ?? ''}
                            aria-label="Clearance status"
                            className="field-input w-auto"
                        >
                            <option value="">All clearance statuses</option>
                            <option value="pending">Pending review</option>
                            <option value="incomplete">Incomplete</option>
                            <option value="cleared">Cleared</option>
                        </select>
                    </SearchFilters>
                    {students.data.length ? (
                        <div className="overflow-x-auto">
                            <table className="clinic-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Degree program</th>
                                        {clinic && <th>Requirements</th>}
                                        <th>Clearance status</th>
                                        <th>Last reviewed</th>
                                        {clinic && (
                                            <th>
                                                <span className="sr-only">
                                                    Review
                                                </span>
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.data.map((student, i) => (
                                        <tr key={student.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <StudentAvatar
                                                        name={student.name}
                                                        index={i}
                                                    />
                                                    <div>
                                                        <p className="font-medium">
                                                            {student.name}
                                                        </p>
                                                        <p className="mt-1 text-[10px] text-muted-foreground">
                                                            {
                                                                student.student_number
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <p>{student.program}</p>
                                                <p className="mt-1 text-[10px] text-muted-foreground">
                                                    Year {student.year_level}
                                                </p>
                                            </td>
                                            {clinic && (
                                                <td>
                                                    <div className="flex gap-1.5">
                                                        {(
                                                            [
                                                                'physical_exam',
                                                                'documents_received',
                                                                'xray_verified',
                                                            ] as const
                                                        ).map((key, idx) => (
                                                            <span
                                                                key={key}
                                                                title={
                                                                    [
                                                                        'Physical examination',
                                                                        'Medical documents',
                                                                        'X-ray verification',
                                                                    ][idx]
                                                                }
                                                                className={
                                                                    'flex size-6 items-center justify-center rounded-full text-[10px] ' +
                                                                    (student
                                                                        .clearance?.[
                                                                        key
                                                                    ]
                                                                        ? 'bg-primary/10 text-primary'
                                                                        : 'bg-muted text-muted-foreground')
                                                                }
                                                            >
                                                                {student
                                                                    .clearance?.[
                                                                    key
                                                                ] ? (
                                                                    <Check className="size-3" />
                                                                ) : (
                                                                    idx + 1
                                                                )}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                            )}
                                            <td>
                                                <StatusBadge
                                                    status={
                                                        student.clearance
                                                            ?.status ??
                                                        'pending'
                                                    }
                                                />
                                            </td>
                                            <td className="text-[11px] text-muted-foreground">
                                                {student.clearance?.reviewed_at
                                                    ? dateLabel(
                                                          student.clearance
                                                              .reviewed_at,
                                                      )
                                                    : 'Not yet reviewed'}
                                            </td>
                                            {clinic && (
                                                <td>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                        className="h-8 text-[11px]"
                                                    >
                                                        <Link
                                                            href={show(
                                                                student.id,
                                                                {
                                                                    query: {
                                                                        school_year:
                                                                            filters.school_year,
                                                                    },
                                                                },
                                                            )}
                                                        >
                                                            Open record
                                                        </Link>
                                                    </Button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            title="No matching students"
                            description="Try another student number, name, or clearance status."
                        />
                    )}
                    <Pagination data={students} />
                </section>
            </div>
        </>
    );
}
Clearances.layout = {
    breadcrumbs: [{ title: 'Medical clearances', href: index() }],
};
