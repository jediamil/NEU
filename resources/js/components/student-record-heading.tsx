import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { StudentAvatar } from '@/components/clinic-ui';
import { Button } from '@/components/ui/button';
import type { Student } from '@/types/clinic';

export function StudentRecordHeading({
    student,
    onEdit,
    children,
}: {
    student: Pick<Student, 'name' | 'student_number'>;
    onEdit: () => void;
    children?: ReactNode;
}) {
    return (
        <header className="panel @container flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 flex-[1_1_13rem] items-center gap-3">
                    <StudentAvatar
                        name={student.name}
                        className="size-11 rounded-xl text-sm"
                    />
                    <div className="min-w-0">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                            Name
                        </p>
                        <h1 className="text-xl leading-tight font-semibold tracking-tight wrap-anywhere sm:text-2xl">
                            {student.name}
                        </h1>
                        <p className="mt-1 text-sm wrap-anywhere text-muted-foreground">
                            Student no. {student.student_number}
                        </p>
                    </div>
                </div>
                <Button variant="outline" onClick={onEdit}>
                    <Pencil className="size-4" />
                    Edit student
                </Button>
            </div>
            {children}
        </header>
    );
}
