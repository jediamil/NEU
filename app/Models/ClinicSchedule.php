<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\ClinicScheduleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property CarbonImmutable $date
 * @property string $opening_time
 * @property string $closing_time
 * @property int $slot_minutes
 * @property int $slot_capacity
 * @property int $daily_capacity
 * @property bool $is_open
 * @property int $morning_capacity
 * @property int $afternoon_capacity
 * @property-read Collection<int, AppointmentSlot> $slots
 */
#[Fillable(['date', 'opening_time', 'closing_time', 'slot_minutes', 'slot_capacity', 'daily_capacity', 'is_open', 'morning_capacity', 'afternoon_capacity'])]
class ClinicSchedule extends Model
{
    /** @use HasFactory<ClinicScheduleFactory> */
    use HasFactory;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['is_open' => 'boolean'];
    }

    /** @return Attribute<CarbonImmutable, string|CarbonImmutable> */
    protected function date(): Attribute
    {
        return Attribute::make(
            get: fn (string $value): CarbonImmutable => CarbonImmutable::parse($value),
            set: fn (string|CarbonImmutable $value): string => CarbonImmutable::parse($value)->toDateString(),
        );
    }

    /** @return HasMany<AppointmentSlot, $this> */
    public function slots(): HasMany
    {
        return $this->hasMany(AppointmentSlot::class);
    }

    public function generateSlots(): void
    {
        foreach (['morning', 'afternoon'] as $period) {
            $this->slots()->updateOrCreate(
                ['period' => $period],
                ['starts_at' => $this->date->setTime($period === 'morning' ? 8 : 13, 0),
                    'ends_at' => $this->date->setTime($period === 'morning' ? 12 : 16, 0),
                    'capacity' => $period === 'morning' ? $this->morning_capacity : $this->afternoon_capacity],
            );
        }
    }

    public function reservedForPeriod(string $period): int
    {
        return (int) $this->slots->filter(fn (AppointmentSlot $slot) => $slot->bookingPeriod() === $period)->sum('reserved_count');
    }
}
