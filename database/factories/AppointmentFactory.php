<?php

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Appointment> */
class AppointmentFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return ['student_id' => Student::factory(), 'appointment_slot_id' => AppointmentSlot::factory(), 'reference' => 'NEU-TEST-'.Str::upper(Str::random(8)), 'service' => 'physical_exam', 'status' => 'scheduled'];
    }
}
