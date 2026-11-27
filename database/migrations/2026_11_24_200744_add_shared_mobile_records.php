<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table): void {
            $table->string('neon_auth_id')->nullable()->unique();
            $table->string('phone', 25)->default('');
            $table->string('theme', 10)->default('system');
        });
        Schema::table('appointments', function (Blueprint $table): void {
            $table->uuid('mobile_id')->nullable()->unique();
        });
        DB::table('appointments')->orderBy('id')->each(function (object $appointment): void {
            DB::table('appointments')->where('id', $appointment->id)->update(['mobile_id' => (string) Str::uuid()]);
        });
        Schema::create('student_announcement_reads', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('announcement_id')->constrained()->cascadeOnDelete();
            $table->unique(['student_id', 'announcement_id']);
        });
        Schema::create('student_sync', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->unsignedBigInteger('revision')->default(0);
        });
        DB::table('student_sync')->insert(['id' => '*', 'revision' => 0]);

        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(<<<'SQL'
                CREATE FUNCTION public.student_signal() RETURNS trigger LANGUAGE plpgsql AS $$
                DECLARE owner_id text; student_key bigint;
                BEGIN
                    IF TG_TABLE_NAME = 'students' THEN
                        owner_id := COALESCE(NEW.neon_auth_id, OLD.neon_auth_id);
                    ELSIF TG_TABLE_NAME IN ('appointments', 'clearances', 'student_announcement_reads') THEN
                        student_key := COALESCE(NEW.student_id, OLD.student_id);
                        SELECT neon_auth_id INTO owner_id FROM public.students WHERE id = student_key;
                    ELSE
                        owner_id := '*';
                    END IF;
                    IF owner_id IS NOT NULL THEN
                        INSERT INTO public.student_sync(id, revision) VALUES(owner_id, 1)
                        ON CONFLICT(id) DO UPDATE SET revision = student_sync.revision + 1;
                    END IF;
                    IF TG_TABLE_NAME = 'appointments' THEN
                        UPDATE public.student_sync SET revision = revision + 1 WHERE id = '*';
                    END IF;
                    RETURN NULL;
                END $$;
                CREATE TRIGGER students_signal AFTER INSERT OR UPDATE OR DELETE ON public.students FOR EACH ROW EXECUTE FUNCTION public.student_signal();
                CREATE TRIGGER appointments_signal AFTER INSERT OR UPDATE OR DELETE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.student_signal();
                CREATE TRIGGER clearances_signal AFTER INSERT OR UPDATE OR DELETE ON public.clearances FOR EACH ROW EXECUTE FUNCTION public.student_signal();
                CREATE TRIGGER reads_signal AFTER INSERT OR UPDATE OR DELETE ON public.student_announcement_reads FOR EACH ROW EXECUTE FUNCTION public.student_signal();
                CREATE TRIGGER schedules_signal AFTER INSERT OR UPDATE OR DELETE ON public.clinic_schedules FOR EACH ROW EXECUTE FUNCTION public.student_signal();
                CREATE TRIGGER slots_signal AFTER INSERT OR UPDATE OR DELETE ON public.appointment_slots FOR EACH ROW EXECUTE FUNCTION public.student_signal();
                CREATE TRIGGER announcements_signal AFTER INSERT OR UPDATE OR DELETE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.student_signal();
                SQL);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new LogicException('Shared student data must be preserved. Use a forward migration.');
    }
};
