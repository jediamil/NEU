<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Appointment;
use App\Models\Clearance;
use App\Models\ClinicSchedule;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $today = now()->toDateString();
        $clinic = $request->user()?->role === 'clinic';
        $todayQuery = Appointment::query()->whereHas('slot', fn ($query) => $query->whereDate('starts_at', $today));
        $todayCounts = $clinic ? Appointment::statusCounts(clone $todayQuery) : ['all' => 0, 'checked_in' => 0, 'reserved' => 0];
        $schedule = $clinic ? ClinicSchedule::query()->where('date', $today)->first() : null;
        $counts = Clearance::statusCountsForYear(config('clinic.active_school_year'));
        $breakdown = ['cleared' => $counts['cleared'], 'incomplete' => $counts['incomplete'], 'pending' => $counts['pending']];

        return Inertia::render('dashboard', [
            'today' => now()->format('l, F j, Y'),
            'stats' => [
                'appointments' => $todayCounts['all'],
                'checked_in' => $todayCounts['checked_in'],
                'pending_clearances' => $breakdown['pending'] + $breakdown['incomplete'],
                'remaining_capacity' => $clinic && $schedule?->is_open ? max(0, $schedule->daily_capacity - $todayCounts['reserved']) : 0,
                'students' => $counts['all'],
                'cleared' => $breakdown['cleared'],
            ],
            'appointments' => $clinic ? (clone $todayQuery)->with(['student', 'slot'])->orderByRaw("CASE status WHEN 'checked_in' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END")->latest('id')->limit(7)->get()->map(fn (Appointment $appointment) => $appointment->summary()) : [],
            'week' => $clinic ? ClinicSchedule::query()->whereBetween('date', [now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString()])->with(['slots' => fn ($query) => $query->withCount(['appointments as reserved_count' => fn ($query) => $query->where('status', '!=', 'cancelled')])])->orderBy('date')->get()->map(fn (ClinicSchedule $day) => [
                'label' => $day->date->format('D'), 'date' => $day->date->toDateString(),
                'booked' => $day->slots->sum('reserved_count'), 'capacity' => $day->is_open ? $day->daily_capacity : 0,
                'is_today' => $day->date->isToday(),
            ]) : [],
            'announcements' => $clinic ? Announcement::query()->whereNotNull('published_at')->latest('published_at')->limit(3)->get(['id', 'title', 'body', 'audience', 'published_at']) : [],
            'clearance_breakdown' => $breakdown,
        ]);
    }
}
