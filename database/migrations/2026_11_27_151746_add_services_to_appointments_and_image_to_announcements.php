<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table): void {
            $table->json('services')->nullable();
        });
        Schema::table('announcements', function (Blueprint $table): void {
            $table->string('image_path')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table): void {
            $table->dropColumn('services');
        });
        Schema::table('announcements', function (Blueprint $table): void {
            $table->dropColumn('image_path');
        });
    }
};
