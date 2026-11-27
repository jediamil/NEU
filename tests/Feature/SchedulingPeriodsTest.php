<?php

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\ClinicSchedule;
use App\Models\Student;
use App\Models\User;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->travelTo(new CarbonImmutable('2026-11-24 07:00:00'));
});

test('the roster redirects guests and refuses registrar access', function () {
    $this->get(route('scheduled-students.index'))->assertRedirect(route('login'));
    $this->actingAs(User::factory()->create(['role' => 'registrar']))->get(route('scheduled-students.index'))->assertForbidden();
});

test('the roster filters the date and period including existing appointment times', function (string $period, int $expected) {
    $day = ClinicSchedule::factory()->create(['date' => '2026-11-25']);
    $day->generateSlots();
    $morning = $day->slots()->where('period', 'morning')->firstOrFail();
    $afternoon = $day->slots()->where('period', 'afternoon')->firstOrFail();
    $legacy = AppointmentSlot::factory()->legacy()->for($day, 'schedule')->create(['starts_at' => '2026-11-25 16:00:00', 'ends_at' => '2026-11-25 16:30:00']);
    foreach ([$morning, $afternoon, $legacy] as $slot) {
        Appointment::factory()->for($slot, 'slot')->create();
    }
    Appointment::factory()->for($morning, 'slot')->create(['status' => 'cancelled']);
    Appointment::factory()->create();

    $this->actingAs(User::factory()->create())->get(route('scheduled-students.index', ['date' => '2026-11-25', 'period' => $period]))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->component('scheduled-students/index')
        ->has('appointments.data', $expected)->where('appointments.total', $expected)
        ->where('filters.date', '2026-11-25')->where('capacity.morning_reserved', 1)->where('capacity.afternoon_reserved', 2));
})->with(['morning' => ['morning', 1], 'afternoon' => ['afternoon', 2], 'whole day' => ['all', 3]]);

test('roster pagination retains its date period search and status filters', function () {
    $slot = AppointmentSlot::factory()->afternoon()->create();
    Appointment::factory()->count(13)->for($slot, 'slot')->create(['status' => 'cancelled']);

    $this->actingAs(User::factory()->create())->get(route('scheduled-students.index', [
        'date' => $slot->starts_at->toDateString(), 'period' => 'afternoon', 'status' => 'cancelled', 'search' => 'NEU-TEST',
    ]))->assertOk()->assertInertia(fn (Assert $page) => $page->has('appointments.data', 12)->where('appointments.total', 13)
        ->where('appointments.next_page_url', fn ($url) => str_contains($url, 'period=afternoon') && str_contains($url, 'status=cancelled') && str_contains($url, 'search=NEU-TEST')));
});

test('invalid roster filters return validation errors', function () {
    $this->actingAs(User::factory()->create())->get(route('scheduled-students.index', ['date' => 'not-a-date', 'period' => 'evening']))
        ->assertSessionHasErrors(['date', 'period']);
});

test('legacy reservations consume period capacity and cancellation releases it', function () {
    $day = ClinicSchedule::factory()->create(['date' => '2026-11-25', 'morning_capacity' => 1]);
    $day->generateSlots();
    $legacy = AppointmentSlot::factory()->legacy()->for($day, 'schedule')->create();
    $existing = Appointment::factory()->for($legacy, 'slot')->create();
    $slot = $day->slots()->where('period', 'morning')->firstOrFail();
    $student = Student::factory()->create();
    $user = User::factory()->create();
    $payload = ['student_id' => $student->id, 'appointment_slot_id' => $slot->id, 'service' => 'tooth_extraction'];

    $this->actingAs($user)->post(route('appointments.store'), $payload)
        ->assertSessionHasErrors(['appointment_slot_id' => 'This booking period is fully booked. Please choose another period.']);
    $this->assertDatabaseCount('appointments', 1);
    $this->actingAs($user)->patch(route('appointments.status', $existing), ['status' => 'cancelled'])->assertSessionHasNoErrors();
    $this->actingAs($user)->post(route('appointments.store'), $payload)->assertSessionHasNoErrors();

    $this->assertDatabaseHas('appointments', ['student_id' => $student->id, 'appointment_slot_id' => $slot->id, 'service' => 'tooth_extraction']);
});

test('an existing booking can keep its time and legacy service but cannot be reused by a new booking', function () {
    $slot = AppointmentSlot::factory()->legacy()->create();
    $existing = Appointment::factory()->for($slot, 'slot')->create(['service' => 'document_submission']);
    $user = User::factory()->create();
    $time = $slot->starts_at->toDateTimeString();

    $this->actingAs($user)->patch(route('appointments.update', $existing), [
        'student_id' => $existing->student_id, 'appointment_slot_id' => $slot->id, 'service' => 'document_submission', 'notes' => 'Original time retained.',
    ])->assertSessionHasNoErrors();
    $this->actingAs($user)->post(route('appointments.store'), [
        'student_id' => Student::factory()->create()->id, 'appointment_slot_id' => $slot->id, 'service' => 'dental_consultation',
    ])->assertSessionHasErrors(['appointment_slot_id' => 'Choose a Morning or Afternoon booking period.']);

    $this->assertDatabaseCount('appointments', 1);
    $this->assertDatabaseHas('appointment_slots', ['id' => $slot->id, 'starts_at' => $time]);
    $this->assertDatabaseHas('appointments', ['id' => $existing->id, 'notes' => 'Original time retained.']);
});

test('a student cannot make another booking in a period already occupied by a legacy appointment', function () {
    $legacy = AppointmentSlot::factory()->legacy()->create();
    $legacy->schedule->generateSlots();
    $existing = Appointment::factory()->for($legacy, 'slot')->create();
    $slot = $legacy->schedule->slots()->where('period', 'morning')->firstOrFail();

    $this->actingAs(User::factory()->create())->post(route('appointments.store'), [
        'student_id' => $existing->student_id, 'appointment_slot_id' => $slot->id, 'service' => 'dental_consultation',
    ])->assertSessionHasErrors(['student_id' => 'This student already has an appointment in this booking period.']);

    $this->assertDatabaseCount('appointments', 1);
});

test('the four current services can be booked', function (string $service) {
    $slot = AppointmentSlot::factory()->create();
    $student = Student::factory()->create();

    $this->actingAs(User::factory()->create())->post(route('appointments.store'), ['student_id' => $student->id, 'appointment_slot_id' => $slot->id, 'service' => $service])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('appointments', ['student_id' => $student->id, 'service' => $service]);
})->with(['physical_exam', 'xray_verification', 'dental_consultation', 'tooth_extraction']);

test('the legacy document service cannot be selected for a new booking', function () {
    $slot = AppointmentSlot::factory()->create();

    $this->actingAs(User::factory()->create())->post(route('appointments.store'), [
        'student_id' => Student::factory()->create()->id, 'appointment_slot_id' => $slot->id, 'service' => 'document_submission',
    ])->assertSessionHasErrors('service');

    $this->assertDatabaseCount('appointments', 0);
});

test('a booking period becomes unavailable exactly when it starts', function (string $period, string $time) {
    $day = ClinicSchedule::factory()->create(['date' => '2026-11-24']);
    $day->generateSlots();
    $slot = $day->slots()->where('period', $period)->firstOrFail();
    $this->travelTo(new CarbonImmutable('2026-11-24 '.$time));

    $this->actingAs(User::factory()->create())->post(route('appointments.store'), [
        'student_id' => Student::factory()->create()->id, 'appointment_slot_id' => $slot->id, 'service' => 'physical_exam',
    ])->assertSessionHasErrors('appointment_slot_id');

    $this->assertDatabaseCount('appointments', 0);
})->with(['morning' => ['morning', '08:00:00'], 'afternoon' => ['afternoon', '13:00:00']]);

test('period capacity cannot be lowered below legacy reservations and no times are changed', function () {
    $day = ClinicSchedule::factory()->create(['date' => '2026-11-25']);
    $legacy = AppointmentSlot::factory()->legacy()->for($day, 'schedule')->create();
    Appointment::factory()->count(2)->for($legacy, 'slot')->create();

    $this->actingAs(User::factory()->create())->patch(route('schedules.update', $day), [
        'date' => '2026-11-25', 'morning_capacity' => 1, 'afternoon_capacity' => 24, 'daily_capacity' => 48, 'is_open' => true,
    ])->assertSessionHasErrors('morning_capacity');

    $this->assertDatabaseHas('clinic_schedules', ['id' => $day->id, 'morning_capacity' => 24]);
    $this->assertDatabaseHas('appointment_slots', ['id' => $legacy->id, 'starts_at' => '2026-11-25 09:00:00', 'ends_at' => '2026-11-25 09:30:00']);
});
