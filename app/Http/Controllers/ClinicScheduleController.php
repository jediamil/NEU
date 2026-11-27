<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClinicScheduleRequest;
use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\ClinicSchedule;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ClinicScheduleController extends Controller
{
    public function index(Request $request): Response
    {
        $request->validate(['week' => ['nullable', 'date_format:Y-m-d']]);
        $start = CarbonImmutable::parse($request->string('week')->toString() ?: now()->toDateString())->startOfWeek();
        $schedules = ClinicSchedule::query()->with(['slots' => fn ($query) => $query->withCount(['appointments as reserved_count' => fn ($query) => $query->where('status', '!=', 'cancelled')])->orderBy('starts_at')])
            ->whereBetween('date', [$start->toDateString(), $start->addDays(6)->toDateString()])->get()->keyBy(fn (ClinicSchedule $day) => $day->date->toDateString());

        $days = collect(range(0, 6))->map(function (int $offset) use ($start, $schedules): array {
            $date = $start->addDays($offset);
            $day = $schedules->get($date->toDateString());

            return [
                'id' => $day?->id, 'date' => $date->toDateString(), 'day' => $date->format('D'),
                'number' => $date->format('d'), 'is_today' => $date->isToday(), 'is_past' => $date->endOfDay()->isPast(),
                'is_open' => $day->is_open ?? false, 'morning_capacity' => $day->morning_capacity ?? 24,
                'afternoon_capacity' => $day->afternoon_capacity ?? 24, 'daily_capacity' => $day->daily_capacity ?? 48,
                'booked' => $day?->slots->sum('reserved_count') ?? 0,
                'slots' => $day?->slots->whereNotNull('period')->map(fn (AppointmentSlot $slot) => [
                    'id' => $slot->id, 'label' => AppointmentSlot::PERIODS[$slot->bookingPeriod()],
                    'capacity' => $slot->capacity, 'reserved' => $day->reservedForPeriod($slot->bookingPeriod()),
                ])->values() ?? [],
            ];
        });

        return Inertia::render('schedules/index', ['days' => $days, 'week' => $start->toDateString(), 'week_label' => $start->format('M j').' – '.$start->addDays(6)->format('M j, Y')]);
    }

    public function store(ClinicScheduleRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $schedule = ClinicSchedule::query()->create([...$request->validated(), 'opening_time' => '08:00', 'closing_time' => '16:00']);
            $schedule->generateSlots();
        });

        return back()->with('success', 'Clinic schedule has been created.');
    }

    public function update(ClinicScheduleRequest $request, ClinicSchedule $schedule): RedirectResponse
    {
        DB::transaction(function () use ($request, $schedule): void {
            $schedule = ClinicSchedule::query()->lockForUpdate()->findOrFail($schedule->id);
            $data = $request->validated();
            if ($schedule->date->toDateString() !== $data['date']) {
                throw ValidationException::withMessages(['date' => 'Create a separate clinic day to use a different date.']);
            }
            $reservations = Appointment::query()->where('status', '!=', 'cancelled')->whereHas('slot', fn ($query) => $query->where('clinic_schedule_id', $schedule->id));
            if ((int) $data['daily_capacity'] < (clone $reservations)->count()) {
                throw ValidationException::withMessages(['daily_capacity' => 'Daily capacity cannot be lower than existing reservations.']);
            }
            foreach (['morning', 'afternoon'] as $period) {
                if ((int) $data[$period.'_capacity'] < (clone $reservations)->whereHas('slot', fn ($query) => $query->inPeriod($period))->count()) {
                    throw ValidationException::withMessages([$period.'_capacity' => ucfirst($period).' capacity cannot be lower than existing reservations.']);
                }
            }
            $schedule->update($data);
            $schedule->generateSlots();
        }, attempts: 3);

        return back()->with('success', 'Clinic schedule has been updated.');
    }
}
