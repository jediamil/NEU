<?php

namespace App\Actions;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\ClinicSchedule;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ManageAppointment
{
    /** @param array<string, mixed> $data */
    public function book(array $data, User $user, ?Appointment $appointment = null): Appointment
    {
        return DB::transaction(function () use ($data, $user, $appointment): Appointment {
            $slot = AppointmentSlot::query()->with('schedule')->lockForUpdate()->whereKey($data['appointment_slot_id'])->firstOrFail();
            $schedule = ClinicSchedule::query()->lockForUpdate()->findOrFail($slot->clinic_schedule_id);

            if (! $schedule->is_open || $slot->starts_at->lte(now())) {
                throw ValidationException::withMessages(['appointment_slot_id' => 'Choose a future appointment slot on an open clinic day.']);
            }

            if ($appointment !== null && $appointment->fresh()?->status !== 'scheduled') {
                throw ValidationException::withMessages(['appointment_slot_id' => 'Only scheduled appointments can be rescheduled.']);
            }

            $reservations = Appointment::query()->where('status', '!=', 'cancelled')->when($appointment !== null, fn ($query) => $query->whereKeyNot($appointment->id));

            if ((clone $reservations)->where('appointment_slot_id', $slot->id)->count() >= $slot->capacity) {
                throw ValidationException::withMessages(['appointment_slot_id' => 'This time slot is fully booked. Please choose another time.']);
            }

            if ((clone $reservations)->whereHas('slot', fn ($query) => $query->where('clinic_schedule_id', $schedule->id))->count() >= $schedule->daily_capacity) {
                throw ValidationException::withMessages(['appointment_slot_id' => 'The clinic has reached its daily appointment capacity.']);
            }

            if ((clone $reservations)->where('student_id', $data['student_id'])->where('appointment_slot_id', $slot->id)->exists()) {
                throw ValidationException::withMessages(['student_id' => 'This student already has an appointment in this time slot.']);
            }

            $values = [
                'student_id' => $data['student_id'], 'appointment_slot_id' => $slot->id,
                'service' => $data['service'], 'notes' => $data['notes'] ?? null,
            ];

            if ($appointment !== null) {
                $appointment->update($values);

                return $appointment;
            }

            return Appointment::query()->create([
                ...$values, 'created_by' => $user->id,
                'reference' => 'NEU-'.now()->format('ymd').'-'.Str::upper(Str::random(6)),
                'status' => 'scheduled',
            ]);
        }, attempts: 3);
    }

    public function transition(Appointment $appointment, string $status): void
    {
        DB::transaction(function () use ($appointment, $status): void {
            $current = Appointment::query()->with('slot')->lockForUpdate()->findOrFail($appointment->id);
            $allowed = [
                'scheduled' => ['checked_in', 'cancelled', 'no_show'],
                'checked_in' => ['completed'],
            ];

            if (! in_array($status, $allowed[$current->status] ?? [], true)) {
                throw ValidationException::withMessages(['status' => 'This appointment cannot move to the selected status.']);
            }

            if ($status === 'checked_in' && ! $current->slot->starts_at->isToday()) {
                throw ValidationException::withMessages(['status' => 'Students can check in only on their appointment date.']);
            }

            if ($status === 'no_show' && $current->slot->ends_at->isFuture()) {
                throw ValidationException::withMessages(['status' => 'Mark a no-show only after the appointment time has passed.']);
            }

            $current->update([
                'status' => $status,
                'checked_in_at' => $status === 'checked_in' ? now() : $current->checked_in_at,
                'completed_at' => $status === 'completed' ? now() : $current->completed_at,
            ]);
        }, attempts: 3);
    }
}
