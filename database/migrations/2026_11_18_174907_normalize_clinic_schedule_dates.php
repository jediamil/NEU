<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('UPDATE clinic_schedules SET date = substr(date, 1, 10) WHERE length(date) > 10');
        }
    }

    public function down(): void
    {
        // A date column should retain its canonical date representation.
    }
};
