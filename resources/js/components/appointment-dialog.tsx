import { useForm } from '@inertiajs/react';
import { CalendarDays, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Field, timeLabel } from '@/components/clinic-ui';
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
    const currentDate = appointment?.starts_at.slice(0, 10);
    const choices =
        appointment && !slots.some((slot) => slot.id === appointment.slot_id)
            ? [
                  {
                      id: appointment.slot_id,
                      date: currentDate!,
                      label:
                          'Existing time · ' + timeLabel(appointment.starts_at),
                      capacity: 0,
                      reserved: 0,
                      remaining: 1,
                      period: null,
                  },
                  ...slots,
              ]
            : slots;
    function remaining(slot: AppointmentSlot) {
        if (slot.period == null) return 1;
        const sameDay = slot.date === currentDate;
        return Math.max(
            0,
            Math.min(
                (slot.period_remaining ?? slot.remaining) +
                    (sameDay && slot.period === appointment?.period ? 1 : 0),
                (slot.daily_remaining ?? slot.remaining) + (sameDay ? 1 : 0),
            ),
        );
    }
    const [date, setDate] = useState(
        appointment ? currentDate! : (choices[0]?.date ?? ''),
    );
    const form = useForm({
        student_id: appointment ? String(appointment.student.id) : '',
        appointment_slot_id: appointment ? String(appointment.slot_id) : '',
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
                        Choose Morning or Afternoon. All services share period
                        and daily capacity.
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
                            {appointment && !services[appointment.service] && (
                                <option value={appointment.service}>
                                    {appointment.service_label} (existing
                                    service)
                                </option>
                            )}
                            {Object.entries(services).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Appointment date" htmlFor="booking-date">
                            <Input
                                id="booking-date"
                                type="date"
                                value={date}
                                onChange={(e) => {
                                    setDate(e.target.value);
                                    form.setData('appointment_slot_id', '');
                                }}
                                required
                            />
                        </Field>
                        <Field
                            label="Booking period"
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
                                <option value="">Choose a period</option>
                                {choices
                                    .filter((slot) => slot.date === date)
                                    .map((slot) => (
                                        <option
                                            key={slot.id}
                                            value={slot.id}
                                            disabled={remaining(slot) === 0}
                                        >
                                            {slot.label}{' '}
                                            {remaining(slot) === 0
                                                ? '· Full'
                                                : ''}
                                        </option>
                                    ))}
                            </select>
                        </Field>
                    </div>
                    {!choices.some((slot) => slot.date === date) && (
                        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                            No booking periods are available for this date.
                            Choose another date or open a clinic schedule.
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
                            disabled={
                                form.processing ||
                                !form.data.appointment_slot_id
                            }
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
