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
        Schema::create('portal_sync', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->unsignedBigInteger('revision')->default(0);
        });
        foreach (['students', 'appointments', 'clearances', 'schedules', 'announcements'] as $id) {
            DB::table('portal_sync')->insert(['id' => $id, 'revision' => 0]);
        }
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(<<<'SQL'
                CREATE FUNCTION public.portal_signal() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    UPDATE public.portal_sync SET revision = revision + 1 WHERE id = TG_ARGV[0];
                    RETURN NULL;
                END $$;
                CREATE TRIGGER portal_students_signal AFTER INSERT OR UPDATE OR DELETE ON public.students FOR EACH ROW EXECUTE FUNCTION public.portal_signal('students');
                CREATE TRIGGER portal_appointments_signal AFTER INSERT OR UPDATE OR DELETE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.portal_signal('appointments');
                CREATE TRIGGER portal_clearances_signal AFTER INSERT OR UPDATE OR DELETE ON public.clearances FOR EACH ROW EXECUTE FUNCTION public.portal_signal('clearances');
                CREATE TRIGGER portal_schedules_signal AFTER INSERT OR UPDATE OR DELETE ON public.clinic_schedules FOR EACH ROW EXECUTE FUNCTION public.portal_signal('schedules');
                CREATE TRIGGER portal_slots_signal AFTER INSERT OR UPDATE OR DELETE ON public.appointment_slots FOR EACH ROW EXECUTE FUNCTION public.portal_signal('schedules');
                CREATE TRIGGER portal_announcements_signal AFTER INSERT OR UPDATE OR DELETE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.portal_signal('announcements');
                SQL);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            foreach (['students', 'appointments', 'clearances', 'schedules', 'slots', 'announcements'] as $table) {
                $target = match ($table) {
                    'schedules' => 'clinic_schedules',
                    'slots' => 'appointment_slots',
                    default => $table,
                };
                DB::statement('DROP TRIGGER IF EXISTS portal_'.$table.'_signal ON public.'.$target);
            }
            DB::statement('DROP FUNCTION IF EXISTS public.portal_signal()');
        }
        Schema::dropIfExists('portal_sync');
    }
};
