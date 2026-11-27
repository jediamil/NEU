<?php

namespace Database\Factories;

use App\Models\AppointmentSlot;
use App\Models\ClinicSchedule;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<AppointmentSlot> */
class AppointmentSlotFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return ['clinic_schedule_id' => ClinicSchedule::factory(), 'period' => 'morning', 'starts_at' => fn (array $attributes) => ClinicSchedule::query()->whereKey($attributes['clinic_schedule_id'])->firstOrFail()->date->setTime(8, 0), 'ends_at' => fn (array $attributes) => CarbonImmutable::parse($attributes['starts_at'])->addHours(4), 'capacity' => 3];
    }

    public function afternoon(): static
    {
        return $this->state(['period' => 'afternoon', 'starts_at' => fn (array $attributes) => ClinicSchedule::query()->whereKey($attributes['clinic_schedule_id'])->firstOrFail()->date->setTime(13, 0), 'ends_at' => fn (array $attributes) => CarbonImmutable::parse($attributes['starts_at'])->addHours(3)]);
    }

    public function legacy(): static
    {
        return $this->state(['period' => null, 'starts_at' => fn (array $attributes) => ClinicSchedule::query()->whereKey($attributes['clinic_schedule_id'])->firstOrFail()->date->setTime(9, 0), 'ends_at' => fn (array $attributes) => CarbonImmutable::parse($attributes['starts_at'])->addMinutes(30)]);
    }
}
