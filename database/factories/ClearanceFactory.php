<?php

namespace Database\Factories;

use App\Models\Clearance;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Clearance> */
class ClearanceFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return ['student_id' => Student::factory(), 'status' => 'pending', 'physical_exam' => false, 'documents_received' => false, 'xray_verified' => false];
    }
}
