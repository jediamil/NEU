<?php

use Illuminate\Support\Facades\DB;

test('upgrading legacy clinic data preserves appointment times and clearance content', function () {
    $original = DB::getDefaultConnection();
    config(['database.connections.upgrade_test' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '', 'foreign_key_constraints' => true]]);
    DB::setDefaultConnection('upgrade_test');

    try {
        (require database_path('migrations/0001_01_01_000000_create_users_table.php'))->up();
        (require database_path('migrations/2026_11_18_092751_create_clinic_prototype_tables.php'))->up();
        DB::table('students')->insert(['id' => 1, 'name' => 'Legacy Student', 'student_number' => 'LEGACY-001', 'program' => 'BSIS', 'year_level' => 1]);
        DB::table('clinic_schedules')->insert(['id' => 1, 'date' => '2026-11-25', 'daily_capacity' => 8, 'is_open' => true]);
        DB::table('appointment_slots')->insert([
            ['id' => 1, 'clinic_schedule_id' => 1, 'starts_at' => '2026-11-25 08:00:00', 'ends_at' => '2026-11-25 08:30:00', 'capacity' => 3],
            ['id' => 2, 'clinic_schedule_id' => 1, 'starts_at' => '2026-11-25 16:00:00', 'ends_at' => '2026-11-25 16:30:00', 'capacity' => 3],
        ]);
        DB::table('appointments')->insert([
            ['id' => 1, 'student_id' => 1, 'appointment_slot_id' => 1, 'reference' => 'ORIGINAL-AM', 'service' => 'physical_exam', 'status' => 'scheduled', 'notes' => 'Keep visit notes'],
            ['id' => 2, 'student_id' => 1, 'appointment_slot_id' => 2, 'reference' => 'ORIGINAL-PM', 'service' => 'document_submission', 'status' => 'scheduled', 'notes' => null],
        ]);
        DB::table('clearances')->insert(['id' => 1, 'student_id' => 1, 'status' => 'cleared', 'physical_exam' => true, 'documents_received' => true, 'xray_verified' => true, 'notes' => 'Keep clearance notes', 'reviewed_at' => '2026-11-18 09:00:00']);
        $appointments = DB::table('appointments')->orderBy('id')->get()->toJson();
        $slots = DB::table('appointment_slots')->orderBy('id')->get(['id', 'starts_at', 'ends_at', 'capacity'])->toJson();

        (require database_path('migrations/2026_11_24_143502_add_booking_periods_to_clinic_schedules.php'))->up();
        (require database_path('migrations/2026_11_24_143503_add_school_year_records_to_clearances.php'))->up();

        expect(DB::table('appointments')->orderBy('id')->get()->toJson())->toBe($appointments);
        expect(DB::table('appointment_slots')->whereIn('id', [1, 2])->orderBy('id')->get(['id', 'starts_at', 'ends_at', 'capacity'])->toJson())->toBe($slots);
        $this->assertDatabaseCount('appointment_slots', 4);
        $this->assertDatabaseHas('appointment_slots', ['clinic_schedule_id' => 1, 'period' => 'morning', 'starts_at' => '2026-11-25 08:00:00', 'ends_at' => '2026-11-25 12:00:00', 'capacity' => 4]);
        $this->assertDatabaseHas('clearances', ['id' => 1, 'school_year' => '2026-2027', 'status' => 'cleared', 'notes' => 'Keep clearance notes', 'reviewed_at' => '2026-11-18 09:00:00', 'exam_data' => null]);
        expect(json_decode(DB::table('clearances')->where('id', 1)->value('student_snapshot'), true))->toMatchArray(['name' => 'Legacy Student', 'year_level' => 1]);
    } finally {
        DB::disconnect('upgrade_test');
        DB::setDefaultConnection($original);
        DB::purge('upgrade_test');
    }
});
