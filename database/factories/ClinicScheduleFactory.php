<?php

namespace Database\Factories;

use App\Models\ClinicSchedule;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ClinicSchedule> */
class ClinicScheduleFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return ['date' => now()->addDays(fake()->unique()->numberBetween(1, 300))->toDateString(), 'opening_time' => '08:00', 'closing_time' => '16:00', 'slot_minutes' => 30, 'slot_capacity' => 3, 'morning_capacity' => 24, 'afternoon_capacity' => 24, 'daily_capacity' => 48, 'is_open' => true];
    }
}
