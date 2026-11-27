import { ArrowUpRight, ClipboardCheck } from 'lucide-react';
import {
    dateLabel,
    EmptyState,
    SectionHeading,
    StatusBadge,
} from '@/components/clinic-ui';
import TextLink from '@/components/text-link';
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
                title="School-year clearance history"
                description="Shows the student information saved with each record."
            />
            {records.length ? (
                <div className="@container overflow-x-auto">
                    <table className="clinic-table">
                        <thead>
                            <tr>
                                <th scope="col" className="@lg:w-1/2">
                                    School-year record
                                </th>
                                <th
                                    scope="col"
                                    className="hidden @lg:table-cell"
                                >
                                    Last reviewed
                                </th>
                                <th
                                    scope="col"
                                    className="w-px text-right @lg:w-36 @lg:text-left"
                                >
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((record) => {
                                const snapshot = record.student_snapshot;
                                const reviewed = record.reviewed_at
                                    ? dateLabel(record.reviewed_at)
                                    : null;

                                return (
                                    <tr key={record.id}>
                                        <td>
                                            <TextLink
                                                href={show(studentId, {
                                                    query: {
                                                        school_year:
                                                            record.school_year,
                                                    },
                                                })}
                                                className="inline-flex items-center gap-1.5 font-semibold text-primary"
                                                aria-label={`Open ${record.school_year} medical record`}
                                            >
                                                {record.school_year}
                                                <ArrowUpRight
                                                    className="size-3.5 shrink-0"
                                                    aria-hidden="true"
                                                />
                                            </TextLink>
                                            {snapshot ? (
                                                <>
                                                    <p className="mt-1 wrap-anywhere">
                                                        {snapshot.name}
                                                    </p>
                                                    <p className="mt-1 text-xs wrap-anywhere text-muted-foreground">
                                                        {snapshot.program} ·
                                                        Year{' '}
                                                        {snapshot.year_level}
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    No student information saved
                                                </p>
                                            )}
                                            <p className="mt-2 text-xs text-muted-foreground @lg:hidden">
                                                {reviewed
                                                    ? `Reviewed ${reviewed}`
                                                    : 'Not yet reviewed'}
                                            </p>
                                        </td>
                                        <td className="hidden text-sm @lg:table-cell">
                                            {reviewed ?? 'Not yet reviewed'}
                                        </td>
                                        <td className="text-right align-top @lg:text-left @lg:align-middle">
                                            <StatusBadge
                                                status={record.status}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
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
