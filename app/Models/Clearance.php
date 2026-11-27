<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\ClearanceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Query\JoinClause;

/**
 * @property int $id
 * @property int $student_id
 * @property string $status
 * @property string $school_year
 * @property array{name: string, student_number: string, program: string, year_level: int}|null $student_snapshot
 * @property array<string, mixed>|null $exam_data
 * @property int|null $reviewed_by
 * @property bool $physical_exam
 * @property bool $documents_received
 * @property bool $xray_verified
 * @property string|null $notes
 * @property CarbonImmutable|null $reviewed_at
 * @property-read Student $student
 */
#[Fillable(['student_id', 'school_year', 'student_snapshot', 'exam_data', 'status', 'physical_exam', 'documents_received', 'xray_verified', 'notes', 'reviewed_by', 'reviewed_at'])]
class Clearance extends Model
{
    /** @use HasFactory<ClearanceFactory> */
    use HasFactory;

    /** @return array{all: int, pending: int, cleared: int, incomplete: int} */
    public static function statusCountsForYear(string $schoolYear): array
    {
        $counts = Student::query()->leftJoin('clearances', function (JoinClause $join) use ($schoolYear): void {
            $join->on('clearances.student_id', '=', 'students.id')->where('clearances.school_year', $schoolYear);
        })->toBase()->selectRaw("COUNT(*) AS total,
            COUNT(CASE WHEN clearances.status = 'cleared' THEN 1 END) AS cleared,
            COUNT(CASE WHEN clearances.status = 'incomplete' THEN 1 END) AS incomplete,
            COUNT(CASE WHEN clearances.id IS NULL OR clearances.status = 'pending' THEN 1 END) AS pending")->first();

        return ['all' => (int) $counts->total, 'pending' => (int) $counts->pending,
            'cleared' => (int) $counts->cleared, 'incomplete' => (int) $counts->incomplete];
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['physical_exam' => 'boolean', 'documents_received' => 'boolean', 'xray_verified' => 'boolean', 'reviewed_at' => 'immutable_datetime', 'student_snapshot' => 'array', 'exam_data' => 'array'];
    }

    /** @return BelongsTo<Student, $this> */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
