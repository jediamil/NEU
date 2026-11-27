import { Head, Link } from '@inertiajs/react';
import { ArrowUpRight, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import {
    EmptyState,
    PageHeading,
    Pagination,
    SearchFilters,
    StatusBadge,
    StudentAvatar,
} from '@/components/clinic-ui';
import { StudentDialog } from '@/components/student-dialog';
import { Button } from '@/components/ui/button';
import { index, show } from '@/routes/students';
import type { Paginated, Student } from '@/types/clinic';

export default function Students({
    students,
    filters,
    total,
}: {
    students: Paginated<Student>;
    filters: Record<string, string>;
    total: number;
}) {
    const [adding, setAdding] = useState(false);
    return (
        <>
            <Head title="Student records" />
            <div className="clinic-page">
                <PageHeading
                    title="Student records"
                    description="Find students by name or student number and open their clinic records."
                >
                    <span className="mr-2 text-xs text-muted-foreground">
                        {total} students on record
                    </span>
                    <Button onClick={() => setAdding(true)}>
                        <Plus className="size-4" />
                        Add student
                    </Button>
                </PageHeading>
                <section className="panel">
                    <SearchFilters
                        url={index.url()}
                        filters={filters}
                        placeholder="Search by student name, number, or program..."
                    />
                    {students.data.length ? (
                        <div className="overflow-x-auto">
                            <table className="clinic-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Student number</th>
                                        <th>Degree program</th>
                                        <th>Year</th>
                                        <th>Medical clearance</th>
                                        <th>
                                            <span className="sr-only">
                                                View student
                                            </span>
                                        </th>
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
                                                            {student.email ??
                                                                'Email not provided'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="font-mono text-[11px]">
                                                {student.student_number}
                                            </td>
                                            <td>{student.program}</td>
                                            <td className="whitespace-nowrap">
                                                Year {student.year_level}
                                            </td>
                                            <td>
                                                <StatusBadge
                                                    status={
                                                        student.clearance
                                                            ?.status ??
                                                        'pending'
                                                    }
                                                />
                                            </td>
                                            <td>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    asChild
                                                >
                                                    <Link
                                                        href={show(student.id)}
                                                        aria-label={
                                                            'View ' +
                                                            student.name
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
                            icon={Users}
                            title="No students found"
                            description="Adjust your search or add a student record to get started."
                        />
                    )}
                    <Pagination data={students} />
                </section>
            </div>
            {adding && <StudentDialog onClose={() => setAdding(false)} />}
        </>
    );
}
Students.layout = {
    breadcrumbs: [{ title: 'Student records', href: index() }],
};
