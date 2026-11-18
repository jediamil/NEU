<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClinicScheduleRequest;
use App\Models\Appointment;
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
        $schedules = ClinicSchedule::query()->with(['slots' => fn ($query) => $query->withCount(['appointments as reserved_count' => fn ($query) => $query->where('status', '!=', 'cancelled')])->orderBy('starts_at')])->whereBetween('date', [$start->toDateString(), $start->addDays(6)->toDateString()])->get()->keyBy(fn (ClinicSchedule $day) => $day->date->toDateString());

        $days = collect(range(0, 6))->map(function (int $offset) use ($start, $schedules): array {
            $date = $start->addDays($offset);
            $day = $schedules->get($date->toDateString());

            return [
                'id' => $day?->id, 'date' => $date->toDateString(), 'day' => $date->format('D'),
                'number' => $date->format('d'), 'is_today' => $date->isToday(), 'is_past' => $date->endOfDay()->isPast(),
                'is_open' => $day->is_open ?? false, 'opening_time' => $day->opening_time ?? '08:00',
                'closing_time' => $day->closing_time ?? '17:00', 'slot_minutes' => $day->slot_minutes ?? 30,
                'slot_capacity' => $day->slot_capacity ?? 3, 'daily_capacity' => $day->daily_capacity ?? 48,
                'booked' => $day?->slots->sum('reserved_count') ?? 0,
                'slots' => $day?->slots->map(fn ($slot) => [
                    'id' => $slot->id, 'label' => $slot->starts_at->format('g:i A'),
                    'capacity' => $slot->capacity, 'reserved' => $slot->reserved_count,
                ])->values() ?? [],
            ];
        });

        return Inertia::render('schedules/index', ['days' => $days, 'week' => $start->toDateString(), 'week_label' => $start->format('M j').' – '.$start->addDays(6)->format('M j, Y')]);
    }

    public function store(ClinicScheduleRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $schedule = ClinicSchedule::query()->create($request->validated());
            $schedule->generateSlots();
            if ($schedule->slots()->count() === 0) {
                throw ValidationException::withMessages(['closing_time' => 'These hours do not contain an appointment slot. Adjust the hours or slot length.']);
            }
        });

        return back()->with('success', 'Clinic schedule has been created.');
    }

    public function update(ClinicScheduleRequest $request, ClinicSchedule $schedule): RedirectResponse
    {
        DB::transaction(function () use ($request, $schedule): void {
            $schedule = ClinicSchedule::query()->lockForUpdate()->findOrFail($schedule->id);
            $reservations = Appointment::query()->where('status', '!=', 'cancelled')->whereHas('slot', fn ($query) => $query->where('clinic_schedule_id', $schedule->id));
            $booked = $reservations->count();
            $data = $request->validated();
            $structureChanged = $schedule->date->toDateString() !== $data['date'] || $schedule->opening_time !== $data['opening_time'] || $schedule->closing_time !== $data['closing_time'] || $schedule->slot_minutes !== (int) $data['slot_minutes'];

            if ((int) $data['daily_capacity'] < $booked) {
                throw ValidationException::withMessages(['daily_capacity' => 'Daily capacity cannot be lower than existing reservations.']);
            }

            $hasHistory = Appointment::query()->whereHas('slot', fn ($query) => $query->where('clinic_schedule_id', $schedule->id))->exists();
            if ($structureChanged && $hasHistory) {
                throw ValidationException::withMessages(['opening_time' => 'Hours, date, and slot length are fixed once a day has appointment history. Capacity and open status can still be changed.']);
            }

            $schedule->slots()->each(function ($slot) use ($data): void {
                if ($slot->appointments()->where('status', '!=', 'cancelled')->count() > (int) $data['slot_capacity']) {
                    throw ValidationException::withMessages(['slot_capacity' => 'Slot capacity cannot be lower than an existing slot’s reservations.']);
                }
            });

            $schedule->update($data);
            if ($structureChanged) {
                $schedule->slots()->delete();
                $schedule->generateSlots();
                if ($schedule->slots()->count() === 0) {
                    throw ValidationException::withMessages(['closing_time' => 'These hours do not contain an appointment slot.']);
                }
            } else {
                $schedule->slots()->update(['capacity' => $schedule->slot_capacity]);
            }
        }, attempts: 3);

        return back()->with('success', 'Clinic schedule has been updated.');
    }
}
