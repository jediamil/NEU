import { useForm } from '@inertiajs/react';
import { ClipboardCheck, LoaderCircle } from 'lucide-react';
import type { FormEvent } from 'react';
import { Field, StudentAvatar } from '@/components/clinic-ui';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { update } from '@/routes/clearances';
import type { Student } from '@/types/clinic';

export function ClearanceDialog({
    student,
    onClose,
}: {
    student: Student;
    onClose: () => void;
}) {
    const clearance = student.clearance;
    const form = useForm({
        status: clearance?.status ?? 'pending',
        physical_exam: clearance?.physical_exam ?? false,
        documents_received: clearance?.documents_received ?? false,
        xray_verified: clearance?.xray_verified ?? false,
        notes: clearance?.notes ?? '',
    });
    function submit(event: FormEvent) {
        event.preventDefault();
        form.patch(update.url(student.id), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    }
    const requirements = [
        [
            'physical_exam',
            'Physical examination',
            'Confirm the student’s physical exam is complete.',
        ],
        [
            'documents_received',
            'Medical documents received',
            'Verify the required enrollment documents.',
        ],
        [
            'xray_verified',
            'X-ray verification',
            'Confirm the submitted X-ray requirement.',
        ],
    ] as const;
    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[520px]">
                <DialogHeader>
                    <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/8 text-primary">
                        <ClipboardCheck className="size-5" />
                    </div>
                    <DialogTitle>Review medical clearance</DialogTitle>
                    <DialogDescription>
                        Review the enrollment requirements before updating this
                        student’s status.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                    <StudentAvatar name={student.name} />
                    <div>
                        <p className="text-sm font-medium">{student.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {student.student_number} · {student.program}
                        </p>
                    </div>
                </div>
                <form onSubmit={submit} className="space-y-5">
                    <fieldset className="space-y-3">
                        <legend className="mb-3 text-xs font-semibold">
                            Requirement checklist
                        </legend>
                        {requirements.map(([key, title, description]) => (
                            <label
                                key={key}
                                className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors has-checked:border-primary/30 has-checked:bg-primary/4"
                            >
                                <input
                                    type="checkbox"
                                    checked={form.data[key]}
                                    onChange={(e) =>
                                        form.setData(key, e.target.checked)
                                    }
                                    className="mt-1 size-4 accent-primary"
                                />
                                <span>
                                    <span className="text-xs font-medium">
                                        {title}
                                    </span>
                                    <span className="mt-1 block text-[11px] text-muted-foreground">
                                        {description}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </fieldset>
                    <Field
                        label="Clearance status"
                        htmlFor="clearance-status"
                        error={form.errors.status}
                    >
                        <select
                            id="clearance-status"
                            className="field-input"
                            value={form.data.status}
                            onChange={(e) =>
                                form.setData('status', e.target.value)
                            }
                        >
                            <option value="pending">Pending review</option>
                            <option value="incomplete">
                                Incomplete requirements
                            </option>
                            <option value="cleared">
                                Cleared for enrollment
                            </option>
                        </select>
                    </Field>
                    <Field
                        label="Clinic notes (optional)"
                        htmlFor="clearance-notes"
                        error={form.errors.notes}
                    >
                        <textarea
                            id="clearance-notes"
                            className="field-input min-h-20"
                            value={form.data.notes}
                            onChange={(e) =>
                                form.setData('notes', e.target.value)
                            }
                            maxLength={3000}
                            placeholder="Record follow-up requirements or review notes"
                        />
                    </Field>
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
                            Save clearance
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
