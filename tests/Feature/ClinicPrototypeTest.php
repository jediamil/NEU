<?php

use App\Models\Announcement;
use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\Clearance;
use App\Models\ClinicSchedule;
use App\Models\Student;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->travelTo(new CarbonImmutable('2026-11-18 08:00:00'));
});

test('clinic pages require a signed in user', function (string $route) {
    $this->get(route($route))->assertRedirect(route('login'));
})->with(['dashboard', 'appointments.index', 'students.index', 'clearances.index', 'schedules.index', 'announcements.index']);

test('portal permissions match staff responsibilities', function (string $role, bool $manage, bool $access) {
    $user = User::factory()->make(['role' => $role]);

    expect(Gate::forUser($user)->allows('manage-clinic'))->toBe($manage);
    expect(Gate::forUser($user)->allows('access-portal'))->toBe($access);
})->with([
    ['clinic', true, true], ['registrar', false, true], ['unknown', false, false],
]);

test('public account registration is unavailable', function () {
    $this->get('/register')->assertNotFound();
    $this->post('/register', ['name' => 'Unauthorized', 'email' => 'unauthorized@example.test', 'password' => 'password', 'password_confirmation' => 'password'])->assertNotFound();
    $this->assertDatabaseMissing('users', ['email' => 'unauthorized@example.test']);
});

test('registrars cannot open clinic operations', function (string $route) {
    $user = User::factory()->create(['role' => 'registrar']);

    $this->actingAs($user)->get(route($route))->assertForbidden();
})->with(['appointments.index', 'students.index', 'schedules.index', 'announcements.index']);

test('registrar clearance lookup omits clinic notes and checklist details', function () {
    $user = User::factory()->create(['role' => 'registrar']);
    $student = Student::factory()->create();
    Clearance::factory()->for($student)->create(['notes' => 'Private clinic note', 'physical_exam' => true]);

    $this->actingAs($user)->get(route('clearances.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('clearances/index')
        ->where('students.data.0.name', $student->name)
        ->where('students.data.0.clearance.status', 'pending')
        ->missing('students.data.0.clearance.notes')
        ->missing('students.data.0.clearance.physical_exam')
        ->missing('students.data.0.email'));
});

test('registrars cannot change a student clearance', function () {
    $user = User::factory()->create(['role' => 'registrar']);
    $student = Student::factory()->create();

    $this->actingAs($user)->patch(route('clearances.update', $student), [
        'status' => 'cleared', 'physical_exam' => true, 'documents_received' => true, 'xray_verified' => true,
    ])->assertForbidden();

    $this->assertDatabaseMissing('clearances', ['student_id' => $student->id]);
});

test('clinic staff can create a student and its pending clearance', function () {
    $user = User::factory()->create();
    $payload = ['student_number' => '2026-98765', 'name' => 'Student Example', 'email' => 'student@example.test', 'program' => 'BS Information Systems', 'year_level' => 2];

    $this->actingAs($user)->post(route('students.store'), $payload)->assertRedirect()->assertSessionHasNoErrors();

    $student = Student::query()->where('student_number', '2026-98765')->firstOrFail();
    $this->assertDatabaseHas('students', $payload);
    $this->assertDatabaseHas('clearances', ['student_id' => $student->id, 'status' => 'pending']);
});

test('duplicate student numbers are rejected without adding records', function () {
    $user = User::factory()->create();
    $student = Student::factory()->create();

    $this->actingAs($user)->post(route('students.store'), ['student_number' => $student->student_number, 'name' => 'Duplicate', 'program' => 'BSIS', 'year_level' => 1])
        ->assertSessionHasErrors('student_number');

    $this->assertDatabaseCount('students', 1);
});

test('staff can book a future shared appointment slot', function () {
    $user = User::factory()->create();
    $student = Student::factory()->create();
    $slot = AppointmentSlot::factory()->create();

    $this->actingAs($user)->post(route('appointments.store'), [
        'student_id' => $student->id, 'appointment_slot_id' => $slot->id, 'service' => 'physical_exam', 'notes' => 'Bring index card.',
    ])->assertRedirect()->assertSessionHasNoErrors();

    $this->assertDatabaseHas('appointments', ['student_id' => $student->id, 'appointment_slot_id' => $slot->id, 'status' => 'scheduled', 'notes' => 'Bring index card.']);
    expect(Appointment::query()->firstOrFail()->reference)->toStartWith('NEU-261118-');
});

test('a full slot rejects another transaction type', function () {
    $user = User::factory()->create();
    $slot = AppointmentSlot::factory()->create(['capacity' => 1]);
    Appointment::factory()->for($slot, 'slot')->create(['service' => 'physical_exam']);
    $student = Student::factory()->create();

    $this->actingAs($user)->post(route('appointments.store'), ['student_id' => $student->id, 'appointment_slot_id' => $slot->id, 'service' => 'xray_verification'])
        ->assertSessionHasErrors(['appointment_slot_id' => 'This time slot is fully booked. Please choose another time.']);

    $this->assertDatabaseCount('appointments', 1);
});

test('daily capacity applies across different time slots', function () {
    $user = User::factory()->create();
    $schedule = ClinicSchedule::factory()->create(['daily_capacity' => 1]);
    $first = AppointmentSlot::factory()->for($schedule, 'schedule')->create();
    $second = AppointmentSlot::factory()->for($schedule, 'schedule')->create(['starts_at' => $schedule->date->setTime(10, 0), 'ends_at' => $schedule->date->setTime(10, 30)]);
    Appointment::factory()->for($first, 'slot')->create();
    $student = Student::factory()->create();

    $this->actingAs($user)->post(route('appointments.store'), ['student_id' => $student->id, 'appointment_slot_id' => $second->id, 'service' => 'document_submission'])
        ->assertSessionHasErrors(['appointment_slot_id' => 'The clinic has reached its daily appointment capacity.']);

    $this->assertDatabaseCount('appointments', 1);
});

test('closed and past slots cannot be booked', function (bool $open, bool $past) {
    $user = User::factory()->create();
    $schedule = ClinicSchedule::factory()->create(['is_open' => $open]);
    $slot = AppointmentSlot::factory()->for($schedule, 'schedule')->create($past ? ['starts_at' => now()->subDay(), 'ends_at' => now()->subDay()->addMinutes(30)] : []);
    $student = Student::factory()->create();

    $this->actingAs($user)->post(route('appointments.store'), ['student_id' => $student->id, 'appointment_slot_id' => $slot->id, 'service' => 'physical_exam'])
        ->assertSessionHasErrors('appointment_slot_id');

    $this->assertDatabaseCount('appointments', 0);
})->with([[false, false], [true, true]]);

test('the same student cannot reserve a time slot twice', function () {
    $user = User::factory()->create();
    $appointment = Appointment::factory()->create();

    $this->actingAs($user)->post(route('appointments.store'), ['student_id' => $appointment->student_id, 'appointment_slot_id' => $appointment->appointment_slot_id, 'service' => 'document_submission'])
        ->assertSessionHasErrors('student_id');

    $this->assertDatabaseCount('appointments', 1);
});

test('editing a reservation in its full slot retains its own capacity', function () {
    $user = User::factory()->create();
    $slot = AppointmentSlot::factory()->create(['capacity' => 1]);
    $appointment = Appointment::factory()->for($slot, 'slot')->create();

    $this->actingAs($user)->patch(route('appointments.update', $appointment), [
        'student_id' => $appointment->student_id, 'appointment_slot_id' => $slot->id, 'service' => 'xray_verification', 'notes' => 'Updated visit.',
    ])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('appointments', ['id' => $appointment->id, 'service' => 'xray_verification', 'notes' => 'Updated visit.']);
});

test('cancelling an appointment releases capacity for another student', function () {
    $user = User::factory()->create();
    $slot = AppointmentSlot::factory()->create(['capacity' => 1]);
    $appointment = Appointment::factory()->for($slot, 'slot')->create();
    $student = Student::factory()->create();

    $this->actingAs($user)->patch(route('appointments.status', $appointment), ['status' => 'cancelled'])->assertSessionHasNoErrors();
    $this->actingAs($user)->post(route('appointments.store'), ['student_id' => $student->id, 'appointment_slot_id' => $slot->id, 'service' => 'document_submission'])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('appointments', ['id' => $appointment->id, 'status' => 'cancelled']);
    $this->assertDatabaseHas('appointments', ['student_id' => $student->id, 'status' => 'scheduled']);
});

test('a visit can be checked in once and then completed', function () {
    $user = User::factory()->create();
    $schedule = ClinicSchedule::factory()->create(['date' => now()->toDateString()]);
    $slot = AppointmentSlot::factory()->for($schedule, 'schedule')->create();
    $appointment = Appointment::factory()->for($slot, 'slot')->create();

    $this->actingAs($user)->patch(route('appointments.status', $appointment), ['status' => 'checked_in'])->assertSessionHasNoErrors();
    expect($appointment->fresh()->checked_in_at)->not->toBeNull();
    $this->actingAs($user)->patch(route('appointments.status', $appointment), ['status' => 'checked_in'])->assertSessionHasErrors('status');
    $this->actingAs($user)->patch(route('appointments.status', $appointment), ['status' => 'completed'])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('appointments', ['id' => $appointment->id, 'status' => 'completed']);
    expect($appointment->fresh()->completed_at)->not->toBeNull();
});

test('future appointments cannot check in or become no-shows', function (string $status) {
    $user = User::factory()->create();
    $appointment = Appointment::factory()->create();

    $this->actingAs($user)->patch(route('appointments.status', $appointment), ['status' => $status])->assertSessionHasErrors('status');

    $this->assertDatabaseHas('appointments', ['id' => $appointment->id, 'status' => 'scheduled']);
})->with(['checked_in', 'no_show']);

test('a checked-in visit cannot be rescheduled', function () {
    $user = User::factory()->create();
    $appointment = Appointment::factory()->create(['status' => 'checked_in']);

    $this->actingAs($user)->patch(route('appointments.update', $appointment), ['student_id' => $appointment->student_id, 'appointment_slot_id' => $appointment->appointment_slot_id, 'service' => 'physical_exam'])
        ->assertSessionHasErrors('appointment_slot_id');

    $this->assertDatabaseHas('appointments', ['id' => $appointment->id, 'status' => 'checked_in']);
});

test('clearance cannot be issued with missing requirements', function () {
    $user = User::factory()->create();
    $student = Student::factory()->create();

    $this->actingAs($user)->patch(route('clearances.update', $student), ['status' => 'cleared', 'physical_exam' => true, 'documents_received' => false, 'xray_verified' => true])
        ->assertSessionHasErrors(['status' => 'Complete all three requirements before issuing medical clearance.']);

    $this->assertDatabaseMissing('clearances', ['student_id' => $student->id, 'status' => 'cleared']);
});

test('a completed checklist can receive clearance with reviewer information', function () {
    $user = User::factory()->create();
    $student = Student::factory()->create();

    $this->actingAs($user)->patch(route('clearances.update', $student), ['status' => 'cleared', 'physical_exam' => true, 'documents_received' => true, 'xray_verified' => true, 'notes' => 'Verified.'])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('clearances', ['student_id' => $student->id, 'status' => 'cleared', 'reviewed_by' => $user->id, 'notes' => 'Verified.']);
});

test('clinic staff can publish and unpublish an announcement', function () {
    $user = User::factory()->create();
    $payload = ['title' => 'Clinic update', 'body' => 'Bring your appointment reference.', 'audience' => 'students', 'published' => true];

    $this->actingAs($user)->post(route('announcements.store'), $payload)->assertSessionHasNoErrors();
    $announcement = Announcement::query()->firstOrFail();
    expect($announcement->published_at)->not->toBeNull();

    $this->actingAs($user)->patch(route('announcements.update', $announcement), [...$payload, 'published' => false])->assertSessionHasNoErrors();
    expect($announcement->fresh()->published_at)->toBeNull();
    $this->assertDatabaseHas('announcements', ['title' => 'Clinic update', 'body' => 'Bring your appointment reference.']);
});

test('a clinic day generates slots around the midday break', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('schedules.store'), [
        'date' => '2026-11-19', 'opening_time' => '11:00', 'closing_time' => '14:00',
        'slot_minutes' => 30, 'slot_capacity' => 3, 'daily_capacity' => 12, 'is_open' => true,
    ])->assertSessionHasNoErrors();

    $this->assertDatabaseCount('appointment_slots', 4);
    expect(AppointmentSlot::query()->orderBy('starts_at')->get()->map(fn ($slot) => $slot->starts_at->format('H:i'))->all())
        ->toBe(['11:00', '11:30', '13:00', '13:30']);
});

test('capacity cannot be reduced below existing reservations', function () {
    $user = User::factory()->create();
    $schedule = ClinicSchedule::factory()->create(['date' => '2026-11-19']);
    $slot = AppointmentSlot::factory()->for($schedule, 'schedule')->create();
    Appointment::factory()->count(2)->for($slot, 'slot')->create();

    $this->actingAs($user)->patch(route('schedules.update', $schedule), [
        'date' => '2026-11-19', 'opening_time' => '08:00', 'closing_time' => '17:00',
        'slot_minutes' => 30, 'slot_capacity' => 1, 'daily_capacity' => 48, 'is_open' => true,
    ])->assertSessionHasErrors('slot_capacity');

    $this->assertDatabaseHas('appointment_slots', ['id' => $slot->id, 'capacity' => 3]);
});

test('closing a day preserves its existing appointments', function () {
    $user = User::factory()->create();
    $schedule = ClinicSchedule::factory()->create(['date' => '2026-11-19']);
    $slot = AppointmentSlot::factory()->for($schedule, 'schedule')->create();
    $appointment = Appointment::factory()->for($slot, 'slot')->create();

    $this->actingAs($user)->patch(route('schedules.update', $schedule), [
        'date' => '2026-11-19', 'opening_time' => '08:00', 'closing_time' => '17:00',
        'slot_minutes' => 30, 'slot_capacity' => 3, 'daily_capacity' => 48, 'is_open' => false,
    ])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('clinic_schedules', ['id' => $schedule->id, 'is_open' => false]);
    $this->assertDatabaseHas('appointments', ['id' => $appointment->id, 'status' => 'scheduled']);
});

test('the dashboard displays actual saved appointment counts', function () {
    $user = User::factory()->create();
    $schedule = ClinicSchedule::factory()->create(['date' => now()->toDateString()]);
    $slot = AppointmentSlot::factory()->for($schedule, 'schedule')->create();
    Appointment::factory()->count(2)->for($slot, 'slot')->create(['status' => 'checked_in']);

    $this->actingAs($user)->get(route('dashboard'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')->where('stats.appointments', 2)->where('stats.checked_in', 2));
});

test('seeding is repeatable and preserves changes to demo records', function () {
    $this->seed();
    $appointment = Appointment::query()->firstOrFail();
    $appointment->update(['status' => 'cancelled']);
    $count = Appointment::query()->count();
    $this->seed();

    $this->assertDatabaseCount('appointments', $count);
    $this->assertDatabaseCount('students', 30);
    $this->assertDatabaseHas('appointments', ['id' => $appointment->id, 'status' => 'cancelled']);
    $this->assertDatabaseHas('users', ['email' => 'clinic@neu.test', 'role' => 'clinic']);
    $this->assertDatabaseHas('users', ['email' => 'registrar@neu.test', 'role' => 'registrar']);
});
