import { Head, router, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    Check,
    CheckCheck,
    ClipboardCheck,
    Clock3,
    MoreHorizontal,
    Plus,
    Search,
    Ticket,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { AppointmentDialog } from '@/components/appointment-dialog';
import { AppointmentTable } from '@/components/appointment-table';
import {
    dateLabel,
    Field,
    PageHeading,
    Pagination,
    SearchFilters,
    StatCard,
    StatusBadge,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { index, status as updateStatus } from '@/routes/appointments';
import type { Appointment, AppointmentSlot, Paginated } from '@/types/clinic';

type Props = {
    appointments: Paginated<Appointment>;
    filters: Record<string, string>;
    students: { id: number; name: string; student_number: string }[];
    slots: AppointmentSlot[];
    services: Record<string, string>;
    counts: {
        all: number;
        scheduled: number;
        checked_in: number;
        completed: number;
    };
};
export default function Appointments({
    appointments,
    filters,
    students,
    slots,
    services,
    counts,
}: Props) {
    const page = usePage();
    const [editing, setEditing] = useState<Appointment | undefined>();
    const [booking, setBooking] = useState(page.url.includes('new=1'));
    const [details, setDetails] = useState<Appointment | null>(null);
    const [verify, setVerify] = useState(false);
    const [reference, setReference] = useState('');
    const [cancelling, setCancelling] = useState<Appointment | null>(null);
    const [processing, setProcessing] = useState(false);
    useEffect(() => {
        if (new URLSearchParams(page.url.split('?')[1]).get('new') === '1') {
            router.replace({
                url: index.url({ query: filters }),
                preserveState: true,
                preserveScroll: true,
            });
        }
    }, [page.url, filters]);
    function transition(appointment: Appointment, status: string) {
        setProcessing(true);
        router.patch(
            updateStatus.url(appointment.id),
            { status },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCancelling(null);
                    setDetails(null);
                },
                onError: (errors) =>
                    toast.error(
                        Object.values(errors)[0] ??
                            'Unable to update appointment.',
                    ),
                onFinish: () => setProcessing(false),
            },
        );
    }
    function lookup(event: FormEvent) {
        event.preventDefault();
        router.get(
            index.url(),
            { search: reference.trim() },
            { onSuccess: () => setVerify(false) },
        );
    }
    function openBooking(appointment?: Appointment) {
        setEditing(appointment);
        setBooking(true);
    }
    return (
        <>
            <Head title="Appointments" />
            <div className="clinic-page">
                <PageHeading
                    eyebrow="CLINIC OPERATIONS"
                    title="Appointments"
                    description="An organized day starts with a well-planned visit. Manage every booking in one place."
                >
                    <Button variant="outline" onClick={() => setVerify(true)}>
                        <Ticket className="size-4" />
                        Verify appointment
                    </Button>
                    <Button onClick={() => openBooking()}>
                        <Plus className="size-4" />
                        New appointment
                    </Button>
                </PageHeading>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="All appointments"
                        value={counts.all}
                        caption="All dates and transaction types"
                        icon={CalendarDays}
                    />
                    <StatCard
                        label="Scheduled visits"
                        value={counts.scheduled}
                        caption="Appointments awaiting arrival"
                        icon={Clock3}
                        tone="blue"
                    />
                    <StatCard
                        label="Checked in"
                        value={counts.checked_in}
                        caption="Students currently at the clinic"
                        icon={ClipboardCheck}
                        tone="amber"
                    />
                    <StatCard
                        label="Completed visits"
                        value={counts.completed}
                        caption="Clinic visits successfully completed"
                        icon={CheckCheck}
                        tone="violet"
                    />
                </div>
                <section className="panel">
                    <SearchFilters
                        url={index.url()}
                        filters={filters}
                        placeholder="Search student name, number, or booking reference..."
                    >
                        <Input
                            type="date"
                            name="date"
                            defaultValue={filters.date ?? ''}
                            aria-label="Appointment date"
                            className="h-10 w-auto"
                        />
                        <select
                            name="status"
                            defaultValue={filters.status ?? ''}
                            aria-label="Appointment status"
                            className="field-input w-auto"
                        >
                            <option value="">All statuses</option>
                            {[
                                'scheduled',
                                'checked_in',
                                'completed',
                                'cancelled',
                                'no_show',
                            ].map((value) => (
                                <option key={value} value={value}>
                                    {value.replace('_', ' ')}
                                </option>
                            ))}
                        </select>
                        <select
                            name="service"
                            defaultValue={filters.service ?? ''}
                            aria-label="Transaction type"
                            className="field-input w-auto"
                        >
                            <option value="">All transactions</option>
                            {Object.entries(services).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </SearchFilters>
                    <AppointmentTable
                        appointments={appointments.data}
                        actions={(appointment) => (
                            <div className="flex items-center justify-end gap-2">
                                {appointment.status === 'scheduled' &&
                                    new Date(
                                        appointment.starts_at,
                                    ).toDateString() ===
                                        new Date().toDateString() && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={processing}
                                            onClick={() =>
                                                transition(
                                                    appointment,
                                                    'checked_in',
                                                )
                                            }
                                            className="h-7 text-[10px]"
                                        >
                                            <Check className="size-3" />
                                            Check in
                                        </Button>
                                    )}
                                {appointment.status === 'checked_in' && (
                                    <Button
                                        size="sm"
                                        disabled={processing}
                                        onClick={() =>
                                            transition(appointment, 'completed')
                                        }
                                        className="h-7 text-[10px]"
                                    >
                                        Complete
                                    </Button>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label={
                                                'Actions for ' +
                                                appointment.reference
                                            }
                                        >
                                            <MoreHorizontal className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() =>
                                                setDetails(appointment)
                                            }
                                        >
                                            View appointment
                                        </DropdownMenuItem>
                                        {appointment.status === 'scheduled' && (
                                            <>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        openBooking(appointment)
                                                    }
                                                >
                                                    Reschedule visit
                                                </DropdownMenuItem>
                                                {new Date(appointment.ends_at) <
                                                    new Date() && (
                                                    <DropdownMenuItem
                                                        disabled={processing}
                                                        onClick={() =>
                                                            transition(
                                                                appointment,
                                                                'no_show',
                                                            )
                                                        }
                                                    >
                                                        Mark as no-show
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() =>
                                                        setCancelling(
                                                            appointment,
                                                        )
                                                    }
                                                >
                                                    Cancel appointment
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}
                    />
                    <Pagination data={appointments} />
                </section>
            </div>
            {booking && (
                <AppointmentDialog
                    appointment={editing}
                    students={students}
                    slots={slots}
                    services={services}
                    onClose={() => setBooking(false)}
                />
            )}
            <Dialog open={verify} onOpenChange={setVerify}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Verify an appointment</DialogTitle>
                        <DialogDescription>
                            Enter the booking reference shown on the student’s
                            appointment pass.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={lookup} className="mt-3 space-y-5">
                        <Field
                            label="Booking reference"
                            htmlFor="booking-reference"
                        >
                            <Input
                                id="booking-reference"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="NEU-..."
                                required
                                autoFocus
                            />
                        </Field>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setVerify(false)}
                            >
                                Cancel
                            </Button>
                            <Button>
                                <Search className="size-4" />
                                Find appointment
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog
                open={!!details}
                onOpenChange={(open) => {
                    if (!open) setDetails(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Appointment details</DialogTitle>
                        <DialogDescription>
                            Booking information for the student’s clinic visit.
                        </DialogDescription>
                    </DialogHeader>
                    {details && (
                        <div className="space-y-5">
                            <div className="rounded-xl border border-dashed bg-primary/4 p-6 text-center">
                                <Ticket className="mx-auto mb-3 size-7 text-primary" />
                                <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
                                    Booking reference
                                </p>
                                <p className="mt-2 text-lg font-semibold tracking-wide">
                                    {details.reference}
                                </p>
                                <div className="mt-3">
                                    <StatusBadge status={details.status} />
                                </div>
                            </div>
                            <dl className="grid grid-cols-2 gap-5 text-sm">
                                <div>
                                    <dt className="text-xs text-muted-foreground">
                                        Student
                                    </dt>
                                    <dd className="mt-1 font-medium">
                                        {details.student.name}
                                    </dd>
                                    <dd className="mt-1 text-xs text-muted-foreground">
                                        {details.student.student_number}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground">
                                        Transaction
                                    </dt>
                                    <dd className="mt-1 font-medium">
                                        {details.service_label}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground">
                                        Date
                                    </dt>
                                    <dd className="mt-1">
                                        {dateLabel(details.starts_at)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground">
                                        Time
                                    </dt>
                                    <dd className="mt-1">
                                        {timeLabel(details.starts_at)}–
                                        {timeLabel(details.ends_at)}
                                    </dd>
                                </div>
                            </dl>
                            {details.notes && (
                                <div className="rounded-lg bg-muted p-3 text-xs leading-relaxed">
                                    {details.notes}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={!!cancelling}
                onOpenChange={(open) => {
                    if (!open) setCancelling(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel this appointment?</DialogTitle>
                        <DialogDescription>
                            {cancelling?.student.name}’s reservation will be
                            cancelled and its capacity released.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCancelling(null)}
                        >
                            Keep appointment
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={processing}
                            onClick={() =>
                                cancelling &&
                                transition(cancelling, 'cancelled')
                            }
                        >
                            <X className="size-4" />
                            Cancel appointment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
Appointments.layout = {
    breadcrumbs: [{ title: 'Appointments', href: index() }],
};
