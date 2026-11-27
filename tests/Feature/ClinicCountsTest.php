<?php

use App\Models\Appointment;
use App\Models\Clearance;
use App\Models\Student;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('appointment totals include every status but cancellations release capacity', function () {
    Appointment::factory()->count(5)->sequence(
        ['status' => 'scheduled'], ['status' => 'checked_in'], ['status' => 'completed'], ['status' => 'cancelled'], ['status' => 'no_show'],
    )->create();

    $counts = Appointment::statusCounts();

    expect($counts)->toBe(['all' => 5, 'scheduled' => 1, 'checked_in' => 1, 'completed' => 1, 'reserved' => 4]);
    expect(Appointment::statusCounts(Appointment::query()->where('status', 'cancelled')))->toBe(['all' => 1, 'scheduled' => 0, 'checked_in' => 0, 'completed' => 0, 'reserved' => 0]);
});

test('clearance totals count missing records as pending and isolate school years', function () {
    $students = Student::factory()->count(4)->create();
    Clearance::factory()->for($students[0])->create(['school_year' => '2026-2027', 'status' => 'cleared']);
    Clearance::factory()->for($students[1])->create(['school_year' => '2026-2027', 'status' => 'incomplete']);
    Clearance::factory()->for($students[2])->create(['school_year' => '2026-2027', 'status' => 'pending']);
    Clearance::factory()->for($students[3])->create(['school_year' => '2025-2026', 'status' => 'cleared']);

    $counts = Clearance::statusCountsForYear('2026-2027');

    expect($counts)->toBe(['all' => 4, 'pending' => 2, 'cleared' => 1, 'incomplete' => 1]);
    expect(Clearance::statusCountsForYear('2025-2026'))->toBe(['all' => 4, 'pending' => 3, 'cleared' => 1, 'incomplete' => 0]);
});

test('empty clinic totals are zero instead of null', function () {
    expect(Appointment::statusCounts())->toBe(['all' => 0, 'scheduled' => 0, 'checked_in' => 0, 'completed' => 0, 'reserved' => 0]);
    expect(Clearance::statusCountsForYear('2026-2027'))->toBe(['all' => 0, 'pending' => 0, 'cleared' => 0, 'incomplete' => 0]);
});

test('appointment filters do not change the global summary totals', function () {
    $user = User::factory()->create();
    Appointment::factory()->count(3)->sequence(['status' => 'scheduled'], ['status' => 'completed'], ['status' => 'cancelled'])->create();

    $this->actingAs($user)->get(route('appointments.index', ['status' => 'cancelled']))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('appointments.total', 1)->where('counts', ['all' => 3, 'scheduled' => 1, 'checked_in' => 0, 'completed' => 1]));
});
