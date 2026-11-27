<?php

use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\ClearanceController;
use App\Http\Controllers\ClinicScheduleController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\RealtimeController;
use App\Http\Controllers\ScheduledStudentController;
use App\Http\Controllers\StudentController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => auth()->check() ? to_route('dashboard') : to_route('login'))->name('home');

Route::middleware(['auth', 'verified', 'can:access-portal'])->group(function (): void {
    Route::post('realtime/subscription', RealtimeController::class)->middleware('throttle:30,1')->name('realtime.subscription');
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('clearances', [ClearanceController::class, 'index'])->name('clearances.index');

    Route::middleware('can:manage-clinic')->group(function (): void {
        Route::get('scheduled-students', ScheduledStudentController::class)->name('scheduled-students.index');
        Route::get('clearances/{student}', [ClearanceController::class, 'show'])->name('clearances.show');
        Route::get('appointments', [AppointmentController::class, 'index'])->name('appointments.index');
        Route::post('appointments', [AppointmentController::class, 'store'])->name('appointments.store');
        Route::patch('appointments/{appointment}', [AppointmentController::class, 'update'])->name('appointments.update');
        Route::patch('appointments/{appointment}/status', [AppointmentController::class, 'status'])->name('appointments.status');
        Route::resource('students', StudentController::class)->only(['index', 'show', 'store', 'update']);
        Route::patch('clearances/{student}', [ClearanceController::class, 'update'])->name('clearances.update');
        Route::get('schedules', [ClinicScheduleController::class, 'index'])->name('schedules.index');
        Route::post('schedules', [ClinicScheduleController::class, 'store'])->name('schedules.store');
        Route::patch('schedules/{schedule}', [ClinicScheduleController::class, 'update'])->name('schedules.update');
        Route::get('announcements', [AnnouncementController::class, 'index'])->name('announcements.index');
        Route::post('announcements', [AnnouncementController::class, 'store'])->name('announcements.store');
        Route::patch('announcements/{announcement}', [AnnouncementController::class, 'update'])->name('announcements.update');
        Route::get('announcements/{announcement}/image', [AnnouncementController::class, 'image'])->name('announcements.image');
        Route::delete('announcements/{announcement}', [AnnouncementController::class, 'destroy'])->name('announcements.destroy');
    });
});

require __DIR__.'/settings.php';
