<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\AppointmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $student_id
 * @property int $appointment_slot_id
 * @property string $reference
 * @property string $service
 * @property string $status
 * @property string|null $notes
 * @property CarbonImmutable|null $checked_in_at
 * @property CarbonImmutable|null $completed_at
 * @property-read Student $student
 * @property-read AppointmentSlot $slot
 */
#[Fillable(['student_id', 'appointment_slot_id', 'created_by', 'reference', 'service', 'status', 'notes', 'checked_in_at', 'completed_at'])]
class Appointment extends Model
{
    /** @use HasFactory<AppointmentFactory> */
    use HasFactory;

    public const array SERVICES = ['physical_exam' => 'Physical examination', 'document_submission' => 'Document submission', 'xray_verification' => 'X-ray verification'];

    public const array STATUSES = ['scheduled', 'checked_in', 'completed', 'cancelled', 'no_show'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['checked_in_at' => 'immutable_datetime', 'completed_at' => 'immutable_datetime'];
    }

    /** @return BelongsTo<Student, $this> */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /** @return BelongsTo<AppointmentSlot, $this> */
    public function slot(): BelongsTo
    {
        return $this->belongsTo(AppointmentSlot::class, 'appointment_slot_id');
    }

    /** @return array<string, mixed> */
    public function summary(): array
    {
        return [
            'id' => $this->id, 'reference' => $this->reference,
            'service' => $this->service, 'service_label' => self::SERVICES[$this->service] ?? $this->service,
            'status' => $this->status, 'notes' => $this->notes,
            'student' => $this->student->only(['id', 'name', 'student_number', 'program', 'year_level']),
            'slot_id' => $this->appointment_slot_id,
            'starts_at' => $this->slot->starts_at->format('Y-m-d\TH:i:s'),
            'ends_at' => $this->slot->ends_at->format('Y-m-d\TH:i:s'),
        ];
    }
}
