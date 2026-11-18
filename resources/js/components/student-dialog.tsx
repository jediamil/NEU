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
        email: student?.email ?? '',
        program: student?.program ?? 'BS Information Systems',
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
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[500px]">
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
                <form onSubmit={submit} className="mt-2 space-y-5">
                    <Field
                        label="Full name"
                        htmlFor="student-name"
                        error={form.errors.name}
                    >
                        <Input
                            id="student-name"
                            value={form.data.name}
                            onChange={(e) =>
                                form.setData('name', e.target.value)
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
                            onChange={(e) =>
                                form.setData('student_number', e.target.value)
                            }
                            required
                            maxLength={30}
                            placeholder="e.g. 2026-12345"
                        />
                    </Field>
                    <Field
                        label="Email address (optional)"
                        htmlFor="student-email"
                        error={form.errors.email}
                    >
                        <Input
                            id="student-email"
                            type="email"
                            value={form.data.email}
                            onChange={(e) =>
                                form.setData('email', e.target.value)
                            }
                            maxLength={150}
                            placeholder="student@example.com"
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
                        <Field
                            label="Degree program"
                            htmlFor="student-program"
                            error={form.errors.program}
                        >
                            <Input
                                id="student-program"
                                value={form.data.program}
                                onChange={(e) =>
                                    form.setData('program', e.target.value)
                                }
                                required
                                maxLength={120}
                            />
                        </Field>
                        <Field
                            label="Year level"
                            htmlFor="student-year"
                            error={form.errors.year_level}
                        >
                            <select
                                id="student-year"
                                className="field-input"
                                value={form.data.year_level}
                                onChange={(e) =>
                                    form.setData(
                                        'year_level',
                                        Number(e.target.value),
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
                    </div>
                    <DialogFooter>
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
