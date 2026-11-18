<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\ClearanceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $student_id
 * @property string $status
 * @property bool $physical_exam
 * @property bool $documents_received
 * @property bool $xray_verified
 * @property string|null $notes
 * @property CarbonImmutable|null $reviewed_at
 * @property-read Student $student
 */
#[Fillable(['student_id', 'status', 'physical_exam', 'documents_received', 'xray_verified', 'notes', 'reviewed_by', 'reviewed_at'])]
class Clearance extends Model
{
    /** @use HasFactory<ClearanceFactory> */
    use HasFactory;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['physical_exam' => 'boolean', 'documents_received' => 'boolean', 'xray_verified' => 'boolean', 'reviewed_at' => 'immutable_datetime'];
    }

    /** @return BelongsTo<Student, $this> */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
