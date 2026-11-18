<?php

namespace App\Models;

use Database\Factories\StudentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
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
 * @property int $year_level
 * @property-read Clearance|null $clearance
 */
#[Fillable(['student_number', 'name', 'email', 'program', 'year_level'])]
class Student extends Model
{
    /** @use HasFactory<StudentFactory> */
    use HasFactory;

    /** @return HasMany<Appointment, $this> */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    /** @return HasOne<Clearance, $this> */
    public function clearance(): HasOne
    {
        return $this->hasOne(Clearance::class);
    }
}
