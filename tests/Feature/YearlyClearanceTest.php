<?php

use App\Models\Clearance;
use App\Models\Student;
use App\Models\User;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->travelTo(new CarbonImmutable('2026-11-24 09:00:00'));
});

test('yearly medical records preserve earlier student information and examination results', function () {
    $student = Student::factory()->create(['year_level' => 1]);
    $user = User::factory()->create();
    $payload = ['school_year' => '2026-2027', 'status' => 'incomplete', 'physical_exam' => true, 'documents_received' => false, 'xray_verified' => false,
        'exam_data' => ['height_cm' => 170.5, 'has_cough' => false, 'has_colds' => null, 'has_allergies' => true, 'allergy_details' => 'Pollen']];
    $this->actingAs($user)->patch(route('clearances.update', $student), $payload)->assertSessionHasNoErrors();
    $student->update(['year_level' => 4]);

    $this->actingAs($user)->patch(route('clearances.update', $student), [...$payload, 'school_year' => '2027-2028', 'exam_data' => ['weight_kg' => 65]])->assertSessionHasNoErrors();

    $this->assertDatabaseCount('clearances', 2);
    $earlier = $student->clearances()->where('school_year', '2026-2027')->firstOrFail();
    expect($earlier->student_snapshot['year_level'])->toBe(1);
    expect($earlier->exam_data)->toMatchArray(['height_cm' => 170.5, 'has_cough' => false, 'has_colds' => null, 'allergy_details' => 'Pollen']);
    expect($student->clearances()->where('school_year', '2027-2028')->firstOrFail()->student_snapshot['year_level'])->toBe(4);
    $this->assertDatabaseHas('clearances', ['id' => $earlier->id, 'reviewed_by' => $user->id, 'reviewed_at' => '2026-11-24 09:00:00']);
});

test('saving the same year updates one record and ignores client supplied snapshots and reviewer identities', function () {
    $student = Student::factory()->create(['year_level' => 2]);
    $record = Clearance::factory()->for($student)->create(['student_snapshot' => $student->clearanceSnapshot()]);
    $user = User::factory()->create();

    $this->actingAs($user)->patch(route('clearances.update', $student), [
        'school_year' => '2026-2027', 'status' => 'pending', 'physical_exam' => false, 'documents_received' => false, 'xray_verified' => false,
        'student_snapshot' => ['year_level' => 6], 'reviewed_by' => 999, 'notes' => 'Updated record.',
    ])->assertSessionHasNoErrors();

    $this->assertDatabaseCount('clearances', 1);
    $this->assertDatabaseHas('clearances', ['id' => $record->id, 'reviewed_by' => $user->id, 'notes' => 'Updated record.']);
    expect($record->fresh()->student_snapshot['year_level'])->toBe(2);
});

test('an unsaved year opens without creating or overwriting a record', function () {
    $student = Student::factory()->create();
    Clearance::factory()->for($student)->create();

    $this->actingAs(User::factory()->create())->get(route('clearances.show', ['student' => $student, 'school_year' => '2027-2028']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->component('clearances/show')->where('record', null)->where('school_year', '2027-2028')->has('history', 1));

    $this->assertDatabaseCount('clearances', 1);
});

test('registrars cannot open clinical records or receive exam notes snapshots or reviewer identity', function () {
    $student = Student::factory()->create();
    Clearance::factory()->for($student)->create(['notes' => 'Private clearance note', 'student_snapshot' => $student->clearanceSnapshot(), 'exam_data' => ['physician_notes' => 'Private clinical note']]);
    $user = User::factory()->create(['role' => 'registrar']);

    $this->actingAs($user)->get(route('clearances.show', $student))->assertForbidden();
    $this->actingAs($user)->get(route('clearances.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('students.data.0.clearance.school_year', '2026-2027')
        ->missing('students.data.0.clearance.exam_data')->missing('students.data.0.clearance.notes')
        ->missing('students.data.0.clearance.student_snapshot')->missing('students.data.0.clearance.reviewed_by')
        ->missing('students.data.0.clearance.physical_exam')->missing('students.data.0.email'));
});

test('guests cannot read or update clinical records', function () {
    $student = Student::factory()->create();

    $this->get(route('clearances.show', $student))->assertRedirect(route('login'));
    $this->patch(route('clearances.update', $student), [])->assertRedirect(route('login'));

    $this->assertDatabaseCount('clearances', 0);
});

test('clearance lookup and dashboard use the selected or active year instead of an older cleared record', function () {
    $student = Student::factory()->create();
    Clearance::factory()->for($student)->create(['school_year' => '2025-2026', 'status' => 'cleared']);
    $this->actingAs(User::factory()->create());

    $this->get(route('clearances.index'))->assertOk()->assertInertia(fn (Assert $page) => $page->where('counts.pending', 1)->where('counts.cleared', 0)->where('students.data.0.clearance', null));
    $this->get(route('clearances.index', ['school_year' => '2025-2026', 'status' => 'cleared']))->assertOk()->assertInertia(fn (Assert $page) => $page->where('counts.cleared', 1)->has('students.data', 1));
    $this->get(route('dashboard'))->assertOk()->assertInertia(fn (Assert $page) => $page->where('stats.cleared', 0)->where('stats.pending_clearances', 1));
});

test('medical record validation rejects invalid years or exam data without saving', function (string $key, mixed $value) {
    $student = Student::factory()->create();
    $payload = ['school_year' => '2026-2027', 'status' => 'pending', 'physical_exam' => false, 'documents_received' => false, 'xray_verified' => false];
    data_set($payload, $key, $value);

    $this->actingAs(User::factory()->create())->patch(route('clearances.update', $student), $payload)->assertSessionHasErrors($key);

    $this->assertDatabaseCount('clearances', 0);
})->with([
    'invalid year format' => ['school_year', '2026'],
    'non consecutive year' => ['school_year', '2026-2028'],
    'zero height' => ['exam_data.height_cm', 0],
    'non numeric weight' => ['exam_data.weight_kg', 'unknown'],
    'fractional blood pressure' => ['exam_data.bp_systolic', 120.5],
    'future menstrual date' => ['exam_data.last_menstrual_period', '2026-11-25'],
    'invalid answer' => ['exam_data.has_cough', 'maybe'],
]);

test('a medical record requires a school year status and explicit clearance checks', function () {
    $student = Student::factory()->create();

    $this->actingAs(User::factory()->create())->patch(route('clearances.update', $student), [])
        ->assertSessionHasErrors(['school_year', 'status', 'physical_exam', 'documents_received', 'xray_verified']);

    $this->assertDatabaseCount('clearances', 0);
});
