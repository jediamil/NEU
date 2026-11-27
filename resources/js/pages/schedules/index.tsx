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
function ScheduleDialog({
    day,
    onClose,
}: {
    day?: ClinicDay;
    onClose: () => void;
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
        is_open: day?.id ? day.is_open : true,
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
                        All services share two booking periods. Set each
                        period’s capacity and the total daily maximum.
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
                    <div className="rounded-xl border bg-muted/40 p-4 text-xs leading-6 text-muted-foreground">
                        <p>Morning: 8:00 AM–12:00 PM</p>
                        <p>Afternoon: 1:00–4:00 PM</p>
                        <p>No appointments during the midday break.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Morning capacity"
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
                            label="Afternoon capacity"
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
                        label="Shared daily maximum"
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
                                Closing a day preserves its existing bookings.
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
                    description="Manage Morning and Afternoon availability and shared capacity."
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
                            </button>
                        ))}
                    </div>
                </section>
                <section className="panel">
                    <SectionHeading
                        title={dateLabel(day.date)}
                        description={
                            day.is_open
                                ? 'Morning and Afternoon share the daily maximum of ' +
                                  day.daily_capacity +
                                  '.'
                                : 'Closed to new bookings.'
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
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => edit(day)}
                                >
                                    <Pencil className="size-3.5" />
                                    {day.id ? 'Edit day' : 'Set availability'}
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
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        {slot.reserved} reserved ·{' '}
                                        {slot.capacity} capacity
                                    </p>
                                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full bg-primary"
                                            style={{
                                                width:
                                                    Math.min(
                                                        100,
                                                        slot.capacity
                                                            ? (slot.reserved /
                                                                  slot.capacity) *
                                                                  100
                                                            : 0,
                                                    ) + '%',
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="px-5 pb-5 text-xs text-muted-foreground">
                            Set availability for this date to open booking
                            periods.
                        </p>
                    )}
                </section>
                <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                    <Info className="mt-0.5 size-4 shrink-0" />
                    Existing appointments keep their original times and count
                    toward the applicable period and daily capacity.
                </p>
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
