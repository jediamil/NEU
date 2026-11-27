<?php

use App\Models\Appointment;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('normal seeding leaves a fresh clinic empty and creates no demo logins', function () {
    config(['clinic.demo_data' => false]);

    $this->seed();

    foreach (['users', 'students', 'appointments', 'clearances', 'clinic_schedules', 'announcements'] as $table) {
        $this->assertDatabaseCount($table, 0);
    }
});

test('staff provisioning creates only the requested login without printing its password', function () {
    config(['clinic.bootstrap_password' => 'Initial-test-password9']);

    $this->artisan('clinic:create-staff', ['email' => 'admin@example.test', '--name' => 'Clinic Admin', '--no-interaction' => true])
        ->expectsOutput('Staff account created. No sample clinic data was inserted.')
        ->assertSuccessful();

    $user = User::query()->firstOrFail();
    expect($user->email)->toBe('admin@example.test');
    expect($user->role)->toBe('clinic');
    expect($user->email_verified_at)->not->toBeNull();
    expect(Hash::check('Initial-test-password9', $user->password))->toBeTrue();
    $this->assertDatabaseCount('students', 0);
});

test('staff provisioning never overwrites an existing login', function () {
    $user = User::factory()->create(['email' => 'existing@example.test']);
    $hash = $user->password;
    config(['clinic.bootstrap_password' => 'Different-password9']);

    $this->artisan('clinic:create-staff', ['email' => $user->email, '--no-interaction' => true])->assertFailed();

    expect($user->fresh()->password)->toBe($hash);
    $this->assertDatabaseCount('users', 1);
});

test('mobile identity cannot be overwritten through the staff student form', function () {
    $staff = User::factory()->create();
    $student = Student::factory()->create();
    $student->forceFill(['neon_auth_id' => 'managed-identity'])->save();

    $this->actingAs($staff)->patch(route('students.update', $student), [
        ...$student->only(['name', 'student_number', 'email', 'program', 'year_level']),
        'neon_auth_id' => 'forged-identity', 'theme' => 'dark',
    ])->assertSessionHasNoErrors()->assertRedirect();

    $this->assertDatabaseHas('students', ['id' => $student->id, 'neon_auth_id' => 'managed-identity', 'theme' => 'system']);
    expect($student->fresh()->toArray())->not->toHaveKey('neon_auth_id');
});

test('staff appointments have stable mobile identifiers across status changes', function () {
    $appointment = Appointment::factory()->create();
    $id = $appointment->getAttribute('mobile_id');

    $appointment->update(['status' => 'cancelled']);

    expect($id)->toBeUuid();
    expect($appointment->fresh()->getAttribute('mobile_id'))->toBe($id);
});
