<?php

namespace Database\Factories;

use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Student> */
class StudentFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return ['student_number' => fake()->unique()->numerify('2026-#####'), 'name' => fake()->name(), 'email' => fake()->unique()->safeEmail(), 'program' => fake()->randomElement(['BS Information Systems', 'BS Information Technology', 'BS Computer Science', 'BS Nursing']), 'year_level' => fake()->numberBetween(1, 4)];
    }
}
