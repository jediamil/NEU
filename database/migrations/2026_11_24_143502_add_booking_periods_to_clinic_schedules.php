<?php

use Carbon\CarbonImmutable;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('clinic_schedules', function (Blueprint $table) {
            Schema::table('clinic_schedules', function (Blueprint $table): void {
                $table->unsignedSmallInteger('morning_capacity')->default(24);
                $table->unsignedSmallInteger('afternoon_capacity')->default(24);
            });
            Schema::table('appointment_slots', function (Blueprint $table): void {
                $table->string('period')->nullable();
                $table->dropUnique(['clinic_schedule_id', 'starts_at']);
                $table->unique(['clinic_schedule_id', 'starts_at', 'ends_at'], 'slots_schedule_times_unique');
                $table->unique(['clinic_schedule_id', 'period'], 'slots_schedule_period_unique');
            });

            DB::table('clinic_schedules')->orderBy('id')->each(function (object $day): void {
                $capacities = [];
                foreach (['morning', 'afternoon'] as $period) {
                    $reserved = DB::table('appointments')->join('appointment_slots', 'appointment_slots.id', '=', 'appointments.appointment_slot_id')
                        ->where('appointment_slots.clinic_schedule_id', $day->id)->where('appointments.status', '!=', 'cancelled')
                        ->whereTime('appointment_slots.starts_at', $period === 'morning' ? '<' : '>=', '12:00')->count();
                    $capacities[$period.'_capacity'] = max((int) ceil($day->daily_capacity / 2), $reserved);
                    $date = CarbonImmutable::parse($day->date);
                    DB::table('appointment_slots')->insert([
                        'clinic_schedule_id' => $day->id, 'period' => $period,
                        'starts_at' => $date->setTime($period === 'morning' ? 8 : 13, 0),
                        'ends_at' => $date->setTime($period === 'morning' ? 12 : 16, 0),
                        'capacity' => $capacities[$period.'_capacity'], 'created_at' => now(), 'updated_at' => now(),
                    ]);
                }
                DB::table('clinic_schedules')->where('id', $day->id)->update($capacities);
            });
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinic_schedules', function (Blueprint $table) {
            if (DB::table('appointments')->whereIn('appointment_slot_id', DB::table('appointment_slots')->whereNotNull('period')->select('id'))->exists()) {
                throw new LogicException('Period bookings exist. Use a forward migration to preserve them.');
            }
            DB::table('appointment_slots')->whereNotNull('period')->delete();
            Schema::table('appointment_slots', function (Blueprint $table): void {
                $table->dropUnique('slots_schedule_times_unique');
                $table->dropUnique('slots_schedule_period_unique');
                $table->dropColumn('period');
                $table->unique(['clinic_schedule_id', 'starts_at']);
            });
            Schema::table('clinic_schedules', fn (Blueprint $table) => $table->dropColumn(['morning_capacity', 'afternoon_capacity']));
        });
    }
};
