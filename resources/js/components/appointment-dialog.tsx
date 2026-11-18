import { useForm } from '@inertiajs/react';
import { CalendarDays, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
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
import { store, update } from '@/routes/appointments';
import type { Appointment, AppointmentSlot } from '@/types/clinic';

export function AppointmentDialog({
    appointment,
    students,
    slots,
    services,
    onClose,
}: {
    appointment?: Appointment;
    students: { id: number; name: string; student_number: string }[];
    slots: AppointmentSlot[];
    services: Record<string, string>;
    onClose: () => void;
}) {
    const dates = [...new Set(slots.map((slot) => slot.date))];
    const [date, setDate] = useState(
        appointment
            ? (slots.find((slot) => slot.id === appointment.slot_id)?.date ??
                  dates[0] ??
                  '')
            : (dates[0] ?? ''),
    );
    const form = useForm({
        student_id: appointment ? String(appointment.student.id) : '',
        appointment_slot_id:
            appointment && slots.some((slot) => slot.id === appointment.slot_id)
                ? String(appointment.slot_id)
                : '',
        service: appointment?.service ?? 'physical_exam',
        notes: appointment?.notes ?? '',
    });
    function submit(event: FormEvent) {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };
        if (appointment) form.patch(update.url(appointment.id), options);
        else form.post(store.url(), options);
    }
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
                        <CalendarDays className="size-5" />
                    </div>
                    <DialogTitle>
                        {appointment
                            ? 'Reschedule appointment'
                            : 'New appointment'}
                    </DialogTitle>
                    <DialogDescription>
                        Reserve a clinic visit for a student. All transaction
                        types share the available slots.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="mt-2 space-y-5">
                    <Field
                        label="Student"
                        htmlFor="booking-student"
                        error={form.errors.student_id}
                    >
                        <select
                            id="booking-student"
                            className="field-input"
                            value={form.data.student_id}
                            onChange={(e) =>
                                form.setData('student_id', e.target.value)
                            }
                            required
                        >
                            <option value="">Choose a student</option>
                            {students.map((student) => (
                                <option key={student.id} value={student.id}>
                                    {student.name} · {student.student_number}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field
                        label="Transaction type"
                        htmlFor="booking-service"
                        error={form.errors.service}
                    >
                        <select
                            id="booking-service"
                            className="field-input"
                            value={form.data.service}
                            onChange={(e) =>
                                form.setData('service', e.target.value)
                            }
                        >
                            {Object.entries(services).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Appointment date" htmlFor="booking-date">
                            <select
                                id="booking-date"
                                className="field-input"
                                value={date}
                                onChange={(e) => {
                                    setDate(e.target.value);
                                    form.setData('appointment_slot_id', '');
                                }}
                                required
                            >
                                <option value="">Choose a date</option>
                                {dates.map((day) => (
                                    <option key={day} value={day}>
                                        {new Date(
                                            day + 'T00:00:00',
                                        ).toLocaleDateString('en-PH', {
                                            month: 'short',
                                            day: 'numeric',
                                            weekday: 'short',
                                        })}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            label="Time slot"
                            htmlFor="booking-time"
                            error={form.errors.appointment_slot_id}
                        >
                            <select
                                id="booking-time"
                                className="field-input"
                                value={form.data.appointment_slot_id}
                                onChange={(e) =>
                                    form.setData(
                                        'appointment_slot_id',
                                        e.target.value,
                                    )
                                }
                                required
                            >
                                <option value="">Choose a time</option>
                                {slots
                                    .filter((slot) => slot.date === date)
                                    .map((slot) => (
                                        <option
                                            key={slot.id}
                                            value={slot.id}
                                            disabled={
                                                slot.remaining === 0 &&
                                                slot.id !== appointment?.slot_id
                                            }
                                        >
                                            {slot.label}{' '}
                                            {slot.remaining === 0 &&
                                            slot.id !== appointment?.slot_id
                                                ? '· Full'
                                                : ''}
                                        </option>
                                    ))}
                            </select>
                        </Field>
                    </div>
                    {!slots.length && (
                        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                            No future clinic slots are available. Create or open
                            a clinic schedule first.
                        </p>
                    )}
                    <Field
                        label="Visit notes (optional)"
                        htmlFor="booking-notes"
                        error={form.errors.notes}
                    >
                        <textarea
                            id="booking-notes"
                            className="field-input min-h-24 resize-y"
                            value={form.data.notes}
                            onChange={(e) =>
                                form.setData('notes', e.target.value)
                            }
                            placeholder="Anything the clinic team should know about this visit"
                            maxLength={2000}
                        />
                    </Field>
                    <Input type="hidden" name="date" value={date} />
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing || !slots.length}
                        >
                            {form.processing && (
                                <LoaderCircle className="size-4 animate-spin" />
                            )}
                            {appointment ? 'Save changes' : 'Book appointment'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
