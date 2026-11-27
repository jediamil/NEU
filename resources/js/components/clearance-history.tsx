import { Link } from '@inertiajs/react';
import { ArrowUpRight, ClipboardCheck } from 'lucide-react';
import {
    dateLabel,
    EmptyState,
    SectionHeading,
    StatusBadge,
} from '@/components/clinic-ui';
import { Button } from '@/components/ui/button';
import { show } from '@/routes/clearances';
import type { ClearanceRecord } from '@/types/clinic';

export function ClearanceHistory({
    studentId,
    records,
}: {
    studentId: number;
    records: ClearanceRecord[];
}) {
    return (
        <section className="panel min-w-0">
            <SectionHeading
                title="School-year history"
                description="Earlier records retain the student information saved with them."
            />
            {records.length ? (
                <div className="overflow-x-auto">
                    <table className="clinic-table">
                        <thead>
                            <tr>
                                <th>School year</th>
                                <th>Student at time of record</th>
                                <th>Status</th>
                                <th>Reviewed</th>
                                <th>
                                    <span className="sr-only">Open record</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((record) => (
                                <tr key={record.id}>
                                    <td className="font-medium">
                                        {record.school_year}
                                    </td>
                                    <td>
                                        <p>
                                            {record.student_snapshot?.name ??
                                                'Not recorded'}
                                        </p>
                                        <p className="mt-1 text-[10px] text-muted-foreground">
                                            {record.student_snapshot
                                                ? record.student_snapshot
                                                      .program +
                                                  ' · Year ' +
                                                  record.student_snapshot
                                                      .year_level
                                                : 'Snapshot available after saving'}
                                        </p>
                                    </td>
                                    <td>
                                        <StatusBadge status={record.status} />
                                    </td>
                                    <td className="text-xs text-muted-foreground">
                                        {record.reviewed_at
                                            ? dateLabel(record.reviewed_at)
                                            : 'Not yet reviewed'}
                                    </td>
                                    <td>
                                        <Button
                                            asChild
                                            size="icon"
                                            variant="ghost"
                                        >
                                            <Link
                                                href={show(studentId, {
                                                    query: {
                                                        school_year:
                                                            record.school_year,
                                                    },
                                                })}
                                                aria-label={
                                                    'Open ' +
                                                    record.school_year +
                                                    ' medical record'
                                                }
                                            >
                                                <ArrowUpRight className="size-4" />
                                            </Link>
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState
                    icon={ClipboardCheck}
                    title="No school-year records yet"
                    description="Save the first clearance record to start this student’s history."
                />
            )}
        </section>
    );
}
