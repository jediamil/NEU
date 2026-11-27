import { useForm } from '@inertiajs/react';
import { CalendarDays, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Field, timeLabel } from '@/components/clinic-ui';
import InputError from '@/components/input-error';
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
        services: appointment
            ? (appointment.services ?? [appointment.service])
            : [],
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
                        {appointment ? 'Edit appointment' : 'New appointment'}
                    </DialogTitle>
                    <DialogDescription>
                        {appointment
                            ? 'Cancel this appointment before booking a different date or period.'
                            : 'Select one or more services for this visit. Only one booking per student per day is allowed.'}
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
                            disabled={!!appointment}
                        >
                            <option value="">Choose a student</option>
                            {students.map((student) => (
                                <option key={student.id} value={student.id}>
                                    {student.name} · {student.student_number}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <fieldset className="grid gap-2">
                        <legend className="mb-2 text-sm font-medium">
                            Services
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {Object.entries({
                                ...Object.fromEntries(
                                    (appointment?.services ?? [])
                                        .filter((service) => !services[service])
                                        .map((service) => [
                                            service,
                                            service === 'document_submission'
                                                ? 'Document submission (existing service)'
                                                : service,
                                        ]),
                                ),
                                ...services,
                            }).map(([value, label]) => (
                                <label
                                    key={value}
                                    className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                                >
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 size-4 shrink-0 accent-primary"
                                        checked={form.data.services.includes(
                                            value,
                                        )}
                                        onChange={(event) =>
                                            form.setData(
                                                'services',
                                                event.target.checked
                                                    ? [
                                                          ...form.data.services,
                                                          value,
                                                      ]
                                                    : form.data.services.filter(
                                                          (service) =>
                                                              service !== value,
                                                      ),
                                            )
                                        }
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                        <InputError
                            message={
                                form.errors.services ??
                                Object.entries(form.errors).find(([key]) =>
                                    key.startsWith('services.'),
                                )?.[1]
                            }
                        />
                    </fieldset>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Appointment date" htmlFor="booking-date">
                            <Input
                                id="booking-date"
                                type="date"
                                readOnly={!!appointment}
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
                                disabled={!!appointment}
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
                                !form.data.appointment_slot_id ||
                                !form.data.services.length
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
