import { useForm } from '@inertiajs/react';
import { LoaderCircle, UserRoundPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { Field } from '@/components/clinic-ui';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { store, update } from '@/routes/students';
import type { Student } from '@/types/clinic';

export function StudentDialog({
    student,
    onClose,
}: {
    student?: Student;
    onClose: () => void;
}) {
    const form = useForm({
        name: student?.name ?? '',
        student_number: student?.student_number ?? '',
        age: student?.age?.toString() ?? '',
        section: student?.section ?? '',
        email: student?.email ?? '',
        program: student?.program ?? 'BS Information Systems',
        college: student?.college ?? '',
        year_level: student?.year_level ?? 1,
    });
    function submit(event: FormEvent) {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };
        if (student) form.patch(update.url(student.id), options);
        else form.post(store.url(), options);
    }
    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/8 text-primary">
                        <UserRoundPlus className="size-5" />
                    </div>
                    <DialogTitle>
                        {student ? 'Edit student record' : 'Add student'}
                    </DialogTitle>
                    <DialogDescription>
                        Keep identification and enrollment details up to date.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="mt-2 grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Full name"
                            htmlFor="student-name"
                            error={form.errors.name}
                        >
                            <Input
                                id="student-name"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                required
                                maxLength={150}
                                placeholder="e.g. Amelia Santos"
                            />
                        </Field>
                        <Field
                            label="Student number"
                            htmlFor="student-number"
                            error={form.errors.student_number}
                        >
                            <Input
                                id="student-number"
                                value={form.data.student_number}
                                onChange={(event) =>
                                    form.setData(
                                        'student_number',
                                        event.target.value,
                                    )
                                }
                                required
                                maxLength={30}
                                placeholder="e.g. 2026-12345"
                            />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <Field
                            label="Age (optional)"
                            htmlFor="student-age"
                            error={form.errors.age}
                        >
                            <Input
                                id="student-age"
                                type="number"
                                min={1}
                                max={130}
                                step={1}
                                value={form.data.age}
                                onChange={(event) =>
                                    form.setData('age', event.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="Year"
                            htmlFor="student-year"
                            error={form.errors.year_level}
                        >
                            <select
                                id="student-year"
                                className="field-input h-9"
                                value={form.data.year_level}
                                onChange={(event) =>
                                    form.setData(
                                        'year_level',
                                        Number(event.target.value),
                                    )
                                }
                            >
                                {[1, 2, 3, 4, 5, 6].map((year) => (
                                    <option key={year} value={year}>
                                        Year {year}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <div className="col-span-2 sm:col-span-1">
                            <Field
                                label="Section (optional)"
                                htmlFor="student-section"
                                error={form.errors.section}
                            >
                                <Input
                                    id="student-section"
                                    value={form.data.section}
                                    onChange={(event) =>
                                        form.setData(
                                            'section',
                                            event.target.value,
                                        )
                                    }
                                    maxLength={60}
                                    placeholder="e.g. 4A"
                                />
                            </Field>
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Course"
                            htmlFor="student-program"
                            error={form.errors.program}
                        >
                            <Input
                                id="student-program"
                                value={form.data.program}
                                onChange={(event) =>
                                    form.setData('program', event.target.value)
                                }
                                required
                                maxLength={120}
                            />
                        </Field>
                        <Field
                            label="College (optional)"
                            htmlFor="student-college"
                            error={form.errors.college}
                        >
                            <Input
                                id="student-college"
                                value={form.data.college}
                                onChange={(event) =>
                                    form.setData('college', event.target.value)
                                }
                                maxLength={150}
                            />
                        </Field>
                    </div>
                    <Field
                        label="Email address (optional)"
                        htmlFor="student-email"
                        error={form.errors.email}
                    >
                        <Input
                            id="student-email"
                            value={form.data.email}
                            onChange={(event) =>
                                form.setData('email', event.target.value)
                            }
                            type="email"
                            maxLength={150}
                            placeholder="student@example.test"
                        />
                    </Field>
                    <DialogFooter className="border-t pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button disabled={form.processing}>
                            {form.processing && (
                                <LoaderCircle className="size-4 animate-spin" />
                            )}
                            {student ? 'Save changes' : 'Add student'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
