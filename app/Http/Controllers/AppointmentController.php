<?php

namespace App\Http\Controllers;

use App\Actions\ManageAppointment;
use App\Http\Requests\AppointmentRequest;
use App\Http\Requests\AppointmentStatusRequest;
use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'], 'date' => ['nullable', 'date_format:Y-m-d'],
            'status' => ['nullable', 'in:scheduled,checked_in,completed,cancelled,no_show'],
            'service' => ['nullable', Rule::in(array_keys(Appointment::SERVICES + Appointment::LEGACY_SERVICES))],
        ]);

        $appointments = Appointment::query()->with(['student', 'slot'])
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->where(fn ($query) => $query->where('reference', 'like', '%'.$search.'%')->orWhereHas('student', fn ($query) => $query->where('name', 'like', '%'.$search.'%')->orWhere('student_number', 'like', '%'.$search.'%'))))
            ->when($filters['date'] ?? null, fn ($query, $date) => $query->whereHas('slot', fn ($query) => $query->whereDate('starts_at', $date)))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['service'] ?? null, fn ($query, $service) => $query->where(fn ($query) => $query->where(fn ($query) => $query->whereNull('services')->where('service', $service))->orWhereJsonContains('services', $service)))
            ->orderByDesc('id')->paginate(10)->appends($filters)->through(fn (Appointment $appointment) => $appointment->summary());

        $slots = AppointmentSlot::query()->with(['schedule.slots' => fn ($query) => $query->withCount(['appointments as reserved_count' => fn ($query) => $query->where('status', '!=', 'cancelled')])])
            ->withCount(['appointments as reserved_count' => fn ($query) => $query->where('status', '!=', 'cancelled')])
            ->whereNotNull('period')->where('ends_at', '>', now())->where('starts_at', '<=', now()->addDays(45))
            ->whereHas('schedule', fn ($query) => $query->where('is_open', true))->orderBy('starts_at')->get()
            ->filter(fn (AppointmentSlot $slot) => $slot->schedule->bookingClosesAt($slot)->isFuture())->values()
            ->map(fn (AppointmentSlot $slot) => [
                'id' => $slot->id, 'date' => $slot->starts_at->toDateString(),
                'label' => AppointmentSlot::PERIODS[$slot->bookingPeriod()], 'period' => $slot->period,
                'capacity' => $slot->capacity, 'reserved' => $slot->schedule->reservedForPeriod($slot->bookingPeriod()),
                'period_remaining' => $slot->capacity - $slot->schedule->reservedForPeriod($slot->bookingPeriod()),
                'daily_remaining' => $slot->schedule->daily_capacity - $slot->schedule->slots->sum('reserved_count'),
                'remaining' => max(0, min($slot->capacity - $slot->schedule->reservedForPeriod($slot->bookingPeriod()), $slot->schedule->daily_capacity - $slot->schedule->slots->sum('reserved_count'))),
            ]);

        return Inertia::render('appointments/index', [
            'appointments' => $appointments, 'filters' => $filters,
            'students' => Student::query()->orderBy('name')->get(['id', 'name', 'student_number']),
            'slots' => $slots, 'services' => Appointment::SERVICES, 'filter_services' => Appointment::SERVICES + Appointment::LEGACY_SERVICES,
            'counts' => collect(Appointment::statusCounts())->except('reserved')->all(),
        ]);
    }

    public function store(AppointmentRequest $request, ManageAppointment $action): RedirectResponse
    {
        $appointment = $action->book($request->validated(), $request->user());

        return back()->with('success', 'Appointment '.$appointment->reference.' has been booked.');
    }

    public function update(AppointmentRequest $request, Appointment $appointment, ManageAppointment $action): RedirectResponse
    {
        $action->book($request->validated(), $request->user(), $appointment);

        return back()->with('success', 'Appointment '.$appointment->reference.' has been updated.');
    }

    public function status(AppointmentStatusRequest $request, Appointment $appointment, ManageAppointment $action): RedirectResponse
    {
        $action->transition($appointment, $request->string('status')->toString());

        return back()->with('success', 'Appointment '.$appointment->reference.' is now '.str_replace('_', ' ', $request->string('status')->toString()).'.');
    }
}
