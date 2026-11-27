import { Head, Link, useForm } from '@inertiajs/react';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock3,
    LoaderCircle,
    Pencil,
    Plus,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
    dateLabel,
    Field,
    PageHeading,
    SectionHeading,
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
import { index as roster } from '@/routes/scheduled-students';
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

function remainingPlaces(day: ClinicDay, slot: ClinicDay['slots'][number]) {
    return Math.max(
        0,
        Math.min(
            slot.capacity - slot.reserved,
            day.daily_capacity - day.booked,
        ),
    );
}

function dayStatus(day: ClinicDay, now: number) {
    if (day.is_past) return 'Past date';
    if (!day.id) return 'No schedule';
    if (!day.is_open) return 'Closed by staff';
    const active = day.slots.filter(
        (slot) => Date.parse(slot.booking_closes_at) > now,
    );
    if (!active.length) return 'Booking ended';
    return active.some((slot) => remainingPlaces(day, slot) > 0)
        ? 'Accepting bookings'
        : 'No places left';
}

function ScheduleDialog({
    day,
    onClose,
    onSaved,
}: {
    day?: ClinicDay;
    onClose: () => void;
    onSaved: (date: string) => void;
}) {
    const form = useForm({
        date:
            day?.date ??
            new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Manila',
            }).format(new Date()),
        morning_capacity: day?.morning_capacity ?? 24,
        afternoon_capacity: day?.afternoon_capacity ?? 24,
        daily_capacity: day?.daily_capacity ?? 48,
        booking_cutoff: day?.booking_cutoff ?? '16:00',
        is_open: day?.id ? day.is_open : true,
    });
    function submit(event: FormEvent) {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => onSaved(form.data.date),
        };
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
                        Choose whether students can book this date and how many
                        visits the clinic can handle.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-5">
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
                    {day?.id && (
                        <p className="text-xs text-muted-foreground">
                            Select another date on the calendar to open a
                            different day.
                        </p>
                    )}
                    <div className="rounded-xl border bg-muted/40 p-4 text-xs leading-6 text-muted-foreground">
                        <p>Morning: 8:00 AM–12:00 PM</p>
                        <p>Afternoon: 1:00–4:00 PM</p>
                        <p>
                            Set a period to 0 places to close it. Times are
                            Philippine time.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Morning places"
                            htmlFor="morning-capacity"
                            error={form.errors.morning_capacity}
                        >
                            <Input
                                id="morning-capacity"
                                type="number"
                                min={0}
                                max={1000}
                                value={form.data.morning_capacity}
                                onChange={(e) =>
                                    form.setData(
                                        'morning_capacity',
                                        Number(e.target.value),
                                    )
                                }
                                required
                            />
                        </Field>
                        <Field
                            label="Afternoon places"
                            htmlFor="afternoon-capacity"
                            error={form.errors.afternoon_capacity}
                        >
                            <Input
                                id="afternoon-capacity"
                                type="number"
                                min={0}
                                max={1000}
                                value={form.data.afternoon_capacity}
                                onChange={(e) =>
                                    form.setData(
                                        'afternoon_capacity',
                                        Number(e.target.value),
                                    )
                                }
                                required
                            />
                        </Field>
                    </div>
                    <Field
                        label="Total visits allowed for the day"
                        htmlFor="daily-capacity"
                        error={form.errors.daily_capacity}
                    >
                        <Input
                            id="daily-capacity"
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
                    <Field
                        label="Same-day booking cutoff"
                        htmlFor="booking-cutoff"
                        error={form.errors.booking_cutoff}
                    >
                        <Input
                            id="booking-cutoff"
                            type="time"
                            min="08:00"
                            max="16:00"
                            value={form.data.booking_cutoff}
                            onChange={(event) =>
                                form.setData(
                                    'booking_cutoff',
                                    event.target.value,
                                )
                            }
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Philippine time. A period closes at this time or
                            when it ends, whichever comes first.
                        </p>
                    </Field>
                    <label className="flex items-center gap-3 rounded-xl border p-4 text-xs">
                        <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={form.data.is_open}
                            onChange={(e) =>
                                form.setData('is_open', e.target.checked)
                            }
                        />
                        <span>
                            Open for new appointments
                            <span className="mt-1 block text-[11px] text-muted-foreground">
                                Turn this off to stop new bookings for this
                                date.
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
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 15_000);
        return () => window.clearInterval(timer);
    }, []);
    function edit(value?: ClinicDay) {
        setEditing(value);
        setOpen(true);
    }
    return (
        <>
            <Head title="Clinic schedule" />
            <div className="clinic-page">
                <PageHeading
                    title="Clinic schedule"
                    description="Select a date to open or close student booking and set how many visits the clinic can take."
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
                                aria-pressed={item.date === day.date}
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
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {dayStatus(item, now)}
                                </p>
                            </button>
                        ))}
                    </div>
                </section>
                <section className="panel">
                    <SectionHeading
                        title={dateLabel(day.date)}
                        description={
                            day.id
                                ? dayStatus(day, now) +
                                  ' · ' +
                                  day.booked +
                                  ' of ' +
                                  day.daily_capacity +
                                  ' visits booked'
                                : 'Set availability to let students book this date.'
                        }
                    >
                        <div className="flex gap-2">
                            <Button asChild variant="outline" size="sm">
                                <Link
                                    href={roster({ query: { date: day.date } })}
                                >
                                    View students
                                </Link>
                            </Button>
                            {!day.is_past && (
                                <Button size="sm" onClick={() => edit(day)}>
                                    <Pencil className="size-3.5" />
                                    {day.id
                                        ? 'Edit availability'
                                        : 'Set availability'}
                                </Button>
                            )}
                        </div>
                    </SectionHeading>
                    {day.slots.length ? (
                        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
                            {day.slots.map((slot) => (
                                <div
                                    key={slot.id}
                                    className="rounded-xl border p-5"
                                >
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Clock3 className="size-4 text-primary" />
                                        {slot.label}
                                    </div>
                                    <p className="mt-3 text-sm font-medium">
                                        {!day.is_open
                                            ? 'Closed by staff'
                                            : slot.capacity === 0
                                              ? 'Closed by staff'
                                              : Date.parse(
                                                      slot.booking_closes_at,
                                                  ) <= now
                                                ? 'Booking ended'
                                                : remainingPlaces(day, slot) +
                                                  ' places left'}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {slot.reserved} booked · {slot.capacity}{' '}
                                        period limit
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="px-5 pb-5 text-xs text-muted-foreground">
                            No booking periods have been set for this date.
                        </p>
                    )}
                </section>
                <p className="text-xs leading-5 text-muted-foreground">
                    Same-day bookings follow the cutoff set for the selected
                    date (Philippine time).
                </p>
            </div>
            {open && (
                <ScheduleDialog
                    day={editing}
                    onClose={() => setOpen(false)}
                    onSaved={(date) => {
                        setSelected(date);
                        setOpen(false);
                    }}
                />
            )}
        </>
    );
}
Schedules.layout = {
    breadcrumbs: [{ title: 'Clinic schedule', href: index() }],
};
