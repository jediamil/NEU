<?php

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\ClinicSchedule;
use App\Models\Student;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->travelTo(now()->setDate(2026, 11, 24)->setTime(7, 0));
});

test('multiple services use one appointment and are all searchable', function () {
    $slot = AppointmentSlot::factory()->create();
    $student = Student::factory()->create();
    $services = ['medical_clearance_submission', 'xray_verification'];

    $this->actingAs(User::factory()->create())->post(route('appointments.store'), [
        'student_id' => $student->id,
        'appointment_slot_id' => $slot->id,
        'services' => $services,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $this->assertDatabaseCount('appointments', 1);
    $appointment = Appointment::query()->sole();
    expect($appointment->services)->toBe($services);
    expect($appointment->service)->toBe('document_submission');

    $this->get(route('appointments.index', ['service' => 'xray_verification']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('appointments.data', 1)
            ->where('appointments.data.0.services', $services)
            ->where('appointments.data.0.service_label', 'Medical clearance submission, X-ray (school-year clearance)'));
});

test('a service selection must contain valid distinct services', function (array $services, string $error) {
    $slot = AppointmentSlot::factory()->create();

    $this->actingAs(User::factory()->create())->post(route('appointments.store'), [
        'student_id' => Student::factory()->create()->id,
        'appointment_slot_id' => $slot->id,
        'services' => $services,
    ])->assertSessionHasErrors($error);

    $this->assertDatabaseCount('appointments', 0);
})->with([
    'empty' => [[], 'services'],
    'unknown' => [['unknown'], 'services.0'],
    'repeated' => [['physical_exam', 'physical_exam'], 'services.1'],
]);

test('a student must cancel before changing booking periods on the same day', function () {
    $day = ClinicSchedule::factory()->create(['date' => '2026-11-25']);
    $day->generateSlots();
    $morning = $day->slots()->where('period', 'morning')->sole();
    $afternoon = $day->slots()->where('period', 'afternoon')->sole();
    $existing = Appointment::factory()->for($afternoon, 'slot')->create();
    $payload = [
        'student_id' => $existing->student_id,
        'appointment_slot_id' => $morning->id,
        'services' => ['xray_verification'],
    ];

    $this->actingAs(User::factory()->create())->post(route('appointments.store'), $payload)
        ->assertSessionHasErrors(['student_id' => 'This student already has an appointment on this date. Cancel it before booking a different period.']);
    $this->patch(route('appointments.update', $existing), $payload)
        ->assertSessionHasErrors('appointment_slot_id');
    $this->assertDatabaseCount('appointments', 1);
    $this->assertDatabaseHas('appointments', ['id' => $existing->id, 'appointment_slot_id' => $afternoon->id]);

    $this->patch(route('appointments.status', $existing), ['status' => 'cancelled'])->assertSessionHasNoErrors();
    $this->post(route('appointments.store'), $payload)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('appointments', ['student_id' => $existing->student_id, 'appointment_slot_id' => $morning->id, 'status' => 'scheduled']);
});
