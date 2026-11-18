import { Head, Link, useForm } from '@inertiajs/react';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Info,
    LoaderCircle,
    Pencil,
    Plus,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
    dateLabel,
    Field,
    PageHeading,
    SectionHeading,
    timeLabel,
} from '@/components/clinic-ui';
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
import { cn } from '@/lib/utils';
import { index, store, update } from '@/routes/schedules';
import type { ClinicDay } from '@/types/clinic';

function shiftWeek(date: string, days: number) {
    const value = new Date(date + 'T00:00:00');
    value.setDate(value.getDate() + days);
    return (
        value.getFullYear() +
        '-' +
        String(value.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(value.getDate()).padStart(2, '0')
    );
}
function ScheduleDialog({
    day,
    onClose,
}: {
    day?: ClinicDay;
    onClose: () => void;
}) {
    const form = useForm({
        date: day?.date ?? new Intl.DateTimeFormat('en-CA').format(new Date()),
        opening_time: day?.opening_time ?? '08:00',
        closing_time: day?.closing_time ?? '17:00',
        slot_minutes: day?.slot_minutes ?? 30,
        slot_capacity: day?.slot_capacity ?? 3,
        daily_capacity: day?.daily_capacity ?? 48,
        is_open: day?.is_open ?? true,
    });
    function submit(event: FormEvent) {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };
        if (day?.id) form.patch(update.url(day.id), options);
        else form.post(store.url(), options);
    }
    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[510px]">
                <DialogHeader>
                    <DialogTitle>
                        {day?.id ? 'Edit clinic day' : 'Add clinic day'}
                    </DialogTitle>
                    <DialogDescription>
                        Set shared availability for all clinic transaction
                        types. The midday break is 12:00–1:00 PM.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="mt-2 space-y-5">
                    <Field
                        label="Clinic date"
                        htmlFor="schedule-date"
                        error={form.errors.date}
                    >
                        <Input
                            id="schedule-date"
                            type="date"
                            value={form.data.date}
                            readOnly={!!day?.id}
                            onChange={(e) =>
                                form.setData('date', e.target.value)
                            }
                            required
                        />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Opening time"
                            htmlFor="schedule-open"
                            error={form.errors.opening_time}
                        >
                            <Input
                                id="schedule-open"
                                type="time"
                                value={form.data.opening_time}
                                onChange={(e) =>
                                    form.setData('opening_time', e.target.value)
                                }
                                required
                            />
                        </Field>
                        <Field
                            label="Closing time"
                            htmlFor="schedule-close"
                            error={form.errors.closing_time}
                        >
                            <Input
                                id="schedule-close"
                                type="time"
                                value={form.data.closing_time}
                                onChange={(e) =>
                                    form.setData('closing_time', e.target.value)
                                }
                                required
                            />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Slot length"
                            htmlFor="schedule-length"
                            error={form.errors.slot_minutes}
                        >
                            <select
                                id="schedule-length"
                                className="field-input"
                                value={form.data.slot_minutes}
                                onChange={(e) =>
                                    form.setData(
                                        'slot_minutes',
                                        Number(e.target.value),
                                    )
                                }
                            >
                                {[15, 30, 60].map((length) => (
                                    <option key={length} value={length}>
                                        {length} minutes
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            label="Students per slot"
                            htmlFor="schedule-slot-capacity"
                            error={form.errors.slot_capacity}
                        >
                            <Input
                                id="schedule-slot-capacity"
                                type="number"
                                min={1}
                                max={100}
                                value={form.data.slot_capacity}
                                onChange={(e) =>
                                    form.setData(
                                        'slot_capacity',
                                        Number(e.target.value),
                                    )
                                }
                                required
                            />
                        </Field>
                    </div>
                    <Field
                        label="Maximum appointments per day"
                        htmlFor="schedule-daily"
                        error={form.errors.daily_capacity}
                    >
                        <Input
                            id="schedule-daily"
                            type="number"
                            min={1}
                            max={1000}
                            value={form.data.daily_capacity}
                            onChange={(e) =>
                                form.setData(
                                    'daily_capacity',
                                    Number(e.target.value),
                                )
                            }
                            required
                        />
                    </Field>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4">
                        <input
                            className="size-4 accent-primary"
                            type="checkbox"
                            checked={form.data.is_open}
                            onChange={(e) =>
                                form.setData('is_open', e.target.checked)
                            }
                        />
                        <span>
                            <span className="block text-xs font-medium">
                                Open for new appointments
                            </span>
                            <span className="mt-1 block text-[11px] text-muted-foreground">
                                Closing a day keeps existing bookings in place.
                            </span>
                        </span>
                    </label>
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
                            Save schedule
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
export default function Schedules({
    days,
    week,
    week_label,
}: {
    days: ClinicDay[];
    week: string;
    week_label: string;
}) {
    const [selected, setSelected] = useState(
        days.find((day) => day.is_today)?.date ?? days[0]?.date,
    );
    const [editing, setEditing] = useState<ClinicDay | undefined>();
    const [open, setOpen] = useState(false);
    const day = days.find((item) => item.date === selected) ?? days[0];
    function edit(value?: ClinicDay) {
        setEditing(value);
        setOpen(true);
    }
    return (
        <>
            <Head title="Clinic schedule" />
            <div className="clinic-page">
                <PageHeading
                    eyebrow="A WELL-PLANNED CLINIC"
                    title="Clinic schedule"
                    description="Make room for every visit. Manage clinic hours and shared appointment capacity."
                >
                    <Button onClick={() => edit()}>
                        <Plus className="size-4" />
                        Add clinic day
                    </Button>
                </PageHeading>
                <section className="panel">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
                        <div className="flex items-center gap-3">
                            <CalendarDays className="size-4 text-primary" />
                            <h2 className="text-sm font-semibold">
                                {week_label}
                            </h2>
                        </div>
                        <div className="flex gap-2">
                            <Button asChild size="icon" variant="outline">
                                <Link
                                    href={index({
                                        query: { week: shiftWeek(week, -7) },
                                    })}
                                    aria-label="Previous week"
                                >
                                    <ChevronLeft className="size-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href={index()}>This week</Link>
                            </Button>
                            <Button asChild size="icon" variant="outline">
                                <Link
                                    href={index({
                                        query: { week: shiftWeek(week, 7) },
                                    })}
                                    aria-label="Next week"
                                >
                                    <ChevronRight className="size-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 xl:grid-cols-7">
                        {days.map((item) => (
                            <button
                                key={item.date}
                                onClick={() => setSelected(item.date)}
                                className={cn(
                                    'relative rounded-xl border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                    item.date === day.date
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary/15'
                                        : 'hover:bg-muted/60',
                                    item.is_past && 'opacity-65',
                                )}
                            >
                                <div className="flex justify-between">
                                    <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                                        {item.day}
                                    </span>
                                    {item.is_today && (
                                        <span className="size-1.5 rounded-full bg-primary" />
                                    )}
                                </div>
                                <p className="mt-2 text-2xl font-semibold">
                                    {item.number}
                                </p>
                                <p
                                    className={cn(
                                        'mt-3 text-[10px]',
                                        item.is_open
                                            ? 'text-primary'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {item.is_open
                                        ? item.booked +
                                          ' / ' +
                                          item.daily_capacity +
                                          ' booked'
                                        : 'Closed'}
                                </p>
                                <div className="mt-2 h-1 rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-primary/60"
                                        style={{
                                            width:
                                                Math.min(
                                                    100,
                                                    item.daily_capacity
                                                        ? (item.booked /
                                                              item.daily_capacity) *
                                                              100
                                                        : 0,
                                                ) + '%',
                                        }}
                                    />
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
                <section className="panel">
                    <SectionHeading
                        title={dateLabel(day.date)}
                        description={
                            day.is_open
                                ? timeLabel(day.date + 'T' + day.opening_time) +
                                  ' – ' +
                                  timeLabel(day.date + 'T' + day.closing_time) +
                                  ' · ' +
                                  day.slot_minutes +
                                  '-minute slots'
                                : 'No new appointments are being accepted for this day.'
                        }
                    >
                        {!day.is_past && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => edit(day)}
                            >
                                <Pencil className="size-3.5" />
                                {day.id
                                    ? 'Edit availability'
                                    : 'Set availability'}
                            </Button>
                        )}
                    </SectionHeading>
                    {day.id && day.is_open ? (
                        <div className="px-5 pb-5">
                            <div className="mb-5 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <span className="size-2 rounded-full bg-primary/60" />
                                    Available
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="size-2 rounded-full bg-amber-400" />
                                    Fully reserved
                                </span>
                                <span className="ml-auto">
                                    {day.booked} appointments reserved ·{' '}
                                    {Math.max(
                                        0,
                                        day.daily_capacity - day.booked,
                                    )}{' '}
                                    daily places remaining
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
                                {day.slots.map((slot) => (
                                    <div
                                        key={slot.id}
                                        className={cn(
                                            'rounded-xl border p-3',
                                            slot.reserved >= slot.capacity
                                                ? 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/40'
                                                : 'bg-background',
                                        )}
                                    >
                                        <Clock3
                                            className={cn(
                                                'mb-3 size-4',
                                                slot.reserved >= slot.capacity
                                                    ? 'text-amber-600'
                                                    : 'text-primary/65',
                                            )}
                                        />
                                        <p className="text-xs font-medium">
                                            {slot.label}
                                        </p>
                                        <p className="mt-1.5 text-[10px] text-muted-foreground">
                                            {slot.reserved} / {slot.capacity}{' '}
                                            reserved
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                            <CalendarDays className="size-8 text-muted-foreground/50" />
                            <h3 className="text-sm font-semibold">
                                Clinic appointments are closed
                            </h3>
                            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                                Choose another day or configure availability to
                                accept appointments.
                            </p>
                        </div>
                    )}
                </section>
                <div className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
                    <Info className="mt-0.5 size-4 shrink-0" />
                    <p>
                        Physical examinations, document submissions, and X-ray
                        verification use the same schedule. All clinic times are
                        Philippine Standard Time.
                    </p>
                </div>
            </div>
            {open && (
                <ScheduleDialog day={editing} onClose={() => setOpen(false)} />
            )}
        </>
    );
}
Schedules.layout = {
    breadcrumbs: [{ title: 'Clinic schedule', href: index() }],
};
