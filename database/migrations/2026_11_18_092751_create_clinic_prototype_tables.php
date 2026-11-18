<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('role')->default('clinic');
        });

        Schema::create('students', function (Blueprint $table): void {
            $table->id();
            $table->string('student_number')->unique();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('program');
            $table->unsignedTinyInteger('year_level');
            $table->timestamps();
        });

        Schema::create('clinic_schedules', function (Blueprint $table): void {
            $table->id();
            $table->date('date')->unique();
            $table->string('opening_time', 5)->default('08:00');
            $table->string('closing_time', 5)->default('17:00');
            $table->unsignedSmallInteger('slot_minutes')->default(30);
            $table->unsignedSmallInteger('slot_capacity')->default(3);
            $table->unsignedSmallInteger('daily_capacity')->default(48);
            $table->boolean('is_open')->default(true);
            $table->timestamps();
        });

        Schema::create('appointment_slots', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('clinic_schedule_id')->constrained()->cascadeOnDelete();
            $table->dateTime('starts_at')->index();
            $table->dateTime('ends_at');
            $table->unsignedSmallInteger('capacity');
            $table->timestamps();
            $table->unique(['clinic_schedule_id', 'starts_at']);
        });

        Schema::create('appointments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            $table->foreignId('appointment_slot_id')->constrained()->restrictOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reference')->unique();
            $table->string('service');
            $table->string('status')->default('scheduled');
            $table->text('notes')->nullable();
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['appointment_slot_id', 'status']);
        });

        Schema::create('clearances', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('status')->default('pending')->index();
            $table->boolean('physical_exam')->default(false);
            $table->boolean('documents_received')->default(false);
            $table->boolean('xray_verified')->default(false);
            $table->text('notes')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('announcements', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->text('body');
            $table->string('audience')->default('students');
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('published_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('clearances');
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('appointment_slots');
        Schema::dropIfExists('clinic_schedules');
        Schema::dropIfExists('students');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('role'));
    }
};
