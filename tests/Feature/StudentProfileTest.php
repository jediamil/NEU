<?php

use App\Models\Student;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('clinic staff can save and view age and section on a student profile', function () {
    $student = Student::factory()->create();
    $profileUrl = route('students.show', $student);
    $payload = [
        ...$student->only(['name', 'student_number', 'program', 'year_level']),
        'age' => 21,
        'section' => '4A',
    ];

    $this->actingAs(User::factory()->create())->from($profileUrl)
        ->patch(route('students.update', $student), $payload)
        ->assertRedirect($profileUrl)
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('students', ['id' => $student->id, 'age' => 21, 'section' => '4A']);
    $this->get($profileUrl)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('students/show')
        ->where('student.age', 21)
        ->where('student.section', '4A'));
});

test('clinic staff can clear optional age and section', function () {
    $student = Student::factory()->create(['age' => 20, 'section' => '3B']);
    $payload = [
        ...$student->only(['name', 'student_number', 'program', 'year_level']),
        'age' => '',
        'section' => '',
    ];

    $this->actingAs(User::factory()->create())
        ->patch(route('students.update', $student), $payload)
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('students', ['id' => $student->id, 'age' => null, 'section' => null]);
});

test('invalid age and section are rejected without changing the student profile', function () {
    $student = Student::factory()->create(['age' => 22, 'section' => '4A']);
    $payload = [
        ...$student->only(['name', 'student_number', 'program', 'year_level']),
        'age' => -1,
        'section' => str_repeat('A', 61),
    ];

    $this->actingAs(User::factory()->create())
        ->patch(route('students.update', $student), $payload)
        ->assertSessionHasErrors(['age', 'section']);

    $this->assertDatabaseHas('students', ['id' => $student->id, 'age' => 22, 'section' => '4A']);
});

test('registrars cannot see age and section when looking up student clearance', function () {
    $student = Student::factory()->create(['age' => 21, 'section' => '4A']);

    $this->actingAs(User::factory()->create(['role' => 'registrar']))
        ->get(route('students.show', $student))
        ->assertForbidden();

    $this->get(route('clearances.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('students.data.0.name', $student->name)
        ->missing('students.data.0.age')
        ->missing('students.data.0.section'));
});
