<?php

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
        Schema::table('clearances', function (Blueprint $table) {
            Schema::table('clearances', function (Blueprint $table): void {
                $table->string('school_year', 9)->default('2026-2027');
                $table->json('student_snapshot')->nullable();
                $table->json('exam_data')->nullable();
                $table->dropUnique(['student_id']);
                $table->unique(['student_id', 'school_year']);
            });
            DB::table('clearances')->orderBy('id')->each(function (object $clearance): void {
                $student = DB::table('students')->where('id', $clearance->student_id)->first(['name', 'student_number', 'program', 'year_level']);
                DB::table('clearances')->where('id', $clearance->id)->update(['student_snapshot' => json_encode($student, JSON_THROW_ON_ERROR)]);
            });
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clearances', function (Blueprint $table) {
            if (DB::table('clearances')->whereNotNull('exam_data')->exists() || DB::table('clearances')->select('student_id')->groupBy('student_id')->havingRaw('COUNT(*) > 1')->exists()) {
                throw new LogicException('Yearly medical records exist. Use a forward migration to preserve them.');
            }
            Schema::table('clearances', function (Blueprint $table): void {
                $table->dropUnique(['student_id', 'school_year']);
                $table->dropColumn(['school_year', 'student_snapshot', 'exam_data']);
                $table->unique('student_id');
            });
        });
    }
};
