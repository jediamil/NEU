<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClearanceRequest;
use App\Models\Clearance;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ClearanceController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate(['search' => ['nullable', 'string', 'max:100'], 'status' => ['nullable', 'in:pending,incomplete,cleared']]);
        $clinic = $request->user()?->role === 'clinic';

        $students = Student::query()->select(['id', 'student_number', 'name', 'program', 'year_level'])
            ->with(['clearance' => fn ($query) => $clinic ? $query : $query->select(['id', 'student_id', 'status', 'reviewed_at'])])
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->where(fn ($query) => $query->where('name', 'like', '%'.$search.'%')->orWhere('student_number', 'like', '%'.$search.'%')))
            ->when($filters['status'] ?? null, function ($query, $status): void {
                if ($status === 'pending') {
                    $query->whereDoesntHave('clearance', fn ($query) => $query->where('status', '!=', 'pending'));
                } else {
                    $query->whereHas('clearance', fn ($query) => $query->where('status', $status));
                }
            })->orderBy('name')->paginate(12)->withQueryString();

        return Inertia::render('clearances/index', [
            'students' => $students, 'filters' => $filters,
            'counts' => [
                'all' => Student::query()->count(),
                'cleared' => Clearance::query()->where('status', 'cleared')->count(),
                'incomplete' => Clearance::query()->where('status', 'incomplete')->count(),
                'pending' => Student::query()->whereDoesntHave('clearance', fn ($query) => $query->where('status', '!=', 'pending'))->count(),
            ],
        ]);
    }

    public function update(ClearanceRequest $request, Student $student): RedirectResponse
    {
        if ($request->string('status')->toString() === 'cleared' && (! $request->boolean('physical_exam') || ! $request->boolean('documents_received') || ! $request->boolean('xray_verified'))) {
            throw ValidationException::withMessages(['status' => 'Complete all three requirements before issuing medical clearance.']);
        }

        $student->clearance()->updateOrCreate(['student_id' => $student->id], [
            ...$request->validated(), 'reviewed_by' => $request->user()?->id, 'reviewed_at' => now(),
        ]);

        return back()->with('success', $student->name.'’s clearance has been updated.');
    }
}
