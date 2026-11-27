<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\AppointmentSlotFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $clinic_schedule_id
 * @property CarbonImmutable $starts_at
 * @property CarbonImmutable $ends_at
 * @property int $capacity
 * @property string|null $period
 * @property-read ClinicSchedule $schedule
 * @property-read int $reserved_count
 */
#[Fillable(['clinic_schedule_id', 'starts_at', 'ends_at', 'capacity', 'period'])]
class AppointmentSlot extends Model
{
    /** @use HasFactory<AppointmentSlotFactory> */
    use HasFactory;

    public const array PERIODS = ['morning' => 'Morning · 8:00 AM–12:00 PM', 'afternoon' => 'Afternoon · 1:00–4:00 PM'];

    /** @return 'morning'|'afternoon' */
    public function bookingPeriod(): string
    {
        return $this->period === 'morning' || ($this->period === null && $this->starts_at->hour < 12) ? 'morning' : 'afternoon';
    }

    /** @param Builder<AppointmentSlot> $query */
    #[Scope]
    protected function inPeriod(Builder $query, string $period): void
    {
        $query->where(fn (Builder $query) => $query->where('period', $period)->orWhere(fn (Builder $query) => $query->whereNull('period')->whereTime('starts_at', $period === 'morning' ? '<' : '>=', '12:00')));
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['starts_at' => 'immutable_datetime', 'ends_at' => 'immutable_datetime'];
    }

    /** @return BelongsTo<ClinicSchedule, $this> */
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(ClinicSchedule::class, 'clinic_schedule_id');
    }

    /** @return HasMany<Appointment, $this> */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }
}
