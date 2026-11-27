<?php

namespace App\Models;

use Database\Factories\StudentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property string $student_number
 * @property string $name
 * @property string|null $email
 * @property string $program
 * @property string|null $college
 * @property int $year_level
 * @property int|null $age
 * @property string|null $section
 * @property-read Clearance|null $clearance
 * @property-read Collection<int, Clearance> $clearances
 */
#[Fillable(['student_number', 'name', 'email', 'program', 'college', 'year_level', 'age', 'section'])]
#[Hidden(['neon_auth_id', 'theme'])]
class Student extends Model
{
    /** @use HasFactory<StudentFactory> */
    use HasFactory;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['age' => 'integer'];
    }

    /** @return HasMany<Appointment, $this> */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    /** @return HasOne<Clearance, $this> */
    public function clearance(): HasOne
    {
        return $this->hasOne(Clearance::class)->where('school_year', config('clinic.active_school_year'));
    }

    /** @return HasMany<Clearance, $this> */
    public function clearances(): HasMany
    {
        return $this->hasMany(Clearance::class);
    }

    /** @return array{name: string, student_number: string, program: string, year_level: int} */
    public function clearanceSnapshot(): array
    {
        return ['name' => $this->name, 'student_number' => $this->student_number, 'program' => $this->program, 'year_level' => $this->year_level];
    }
}
