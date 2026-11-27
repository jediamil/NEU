<?php

namespace App\Http\Controllers;

use App\Http\Requests\ScheduledStudentRequest;
use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\ClinicSchedule;
use Inertia\Inertia;
use Inertia\Response;

class ScheduledStudentController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(ScheduledStudentRequest $request): Response
    {
        $filters = [...$request->validated(), 'date' => $request->input('date') ?: now()->toDateString(), 'period' => $request->input('period') ?: 'all'];
        $query = Appointment::query()->with(['student', 'slot'])
            ->whereHas('slot', fn ($query) => $query->whereDate('starts_at', $filters['date']))
            ->when($filters['period'] !== 'all', fn ($query) => $query->whereHas('slot', fn ($query) => $query->inPeriod($filters['period'])))
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->where(fn ($query) => $query->where('reference', 'like', '%'.$search.'%')->orWhereHas('student', fn ($query) => $query->where('name', 'like', '%'.$search.'%')->orWhere('student_number', 'like', '%'.$search.'%'))))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status), fn ($query) => $query->where('status', '!=', 'cancelled'));
        $day = ClinicSchedule::query()->with(['slots' => fn ($query) => $query->withCount(['appointments as reserved_count' => fn ($query) => $query->where('status', '!=', 'cancelled')])])->whereDate('date', $filters['date'])->first();

        return Inertia::render('scheduled-students/index', [
            'appointments' => $query->orderBy(AppointmentSlot::query()->select('starts_at')->whereColumn('appointment_slots.id', 'appointments.appointment_slot_id'))->orderBy('id')->paginate(12)->appends($filters)->through(fn (Appointment $appointment) => $appointment->summary()),
            'filters' => $filters,
            'capacity' => $day ? ['is_open' => $day->is_open, 'morning' => $day->morning_capacity, 'afternoon' => $day->afternoon_capacity,
                'daily' => $day->daily_capacity, 'morning_reserved' => $day->reservedForPeriod('morning'), 'afternoon_reserved' => $day->reservedForPeriod('afternoon')] : null,
        ]);
    }
}
