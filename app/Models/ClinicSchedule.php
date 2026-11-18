<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\ClinicScheduleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
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
 */
#[Fillable(['date', 'opening_time', 'closing_time', 'slot_minutes', 'slot_capacity', 'daily_capacity', 'is_open'])]
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
        $start = CarbonImmutable::parse($this->date->format('Y-m-d').' '.$this->opening_time);
        $close = CarbonImmutable::parse($this->date->format('Y-m-d').' '.$this->closing_time);

        for ($time = $start; $time->addMinutes($this->slot_minutes)->lte($close); $time = $time->addMinutes($this->slot_minutes)) {
            if ($time->hour < 13 && $time->addMinutes($this->slot_minutes)->hour >= 12 && $time->addMinutes($this->slot_minutes)->format('H:i') > '12:00') {
                continue;
            }
            if ($time->hour === 12) {
                continue;
            }

            $this->slots()->firstOrCreate(
                ['starts_at' => $time],
                ['ends_at' => $time->addMinutes($this->slot_minutes), 'capacity' => $this->slot_capacity],
            );
        }
    }
}
