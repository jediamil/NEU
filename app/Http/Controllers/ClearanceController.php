<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClearanceRequest;
use App\Models\Clearance;
use App\Models\Student;
use App\Rules\SchoolYear;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ClearanceController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate(['search' => ['nullable', 'string', 'max:100'], 'status' => ['nullable', 'in:pending,incomplete,cleared'], 'school_year' => ['nullable', new SchoolYear]]);
        $filters['school_year'] = $filters['school_year'] ?? config('clinic.active_school_year');
        $year = $filters['school_year'];
        $clinic = $request->user()?->role === 'clinic';
        $students = Student::query()->select(['id', 'student_number', 'name', 'program', 'year_level'])
            ->with(['clearances' => fn ($query) => $query->where('school_year', $year)->select($clinic
                ? ['id', 'student_id', 'school_year', 'status', 'physical_exam', 'documents_received', 'xray_verified', 'reviewed_at']
                : ['id', 'student_id', 'school_year', 'status', 'reviewed_at'])])
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->where(fn ($query) => $query->where('name', 'like', '%'.$search.'%')->orWhere('student_number', 'like', '%'.$search.'%')))
            ->when($filters['status'] ?? null, function ($query, $status) use ($year): void {
                if ($status === 'pending') {
                    $query->whereDoesntHave('clearances', fn ($query) => $query->where('school_year', $year)->where('status', '!=', 'pending'));
                } else {
                    $query->whereHas('clearances', fn ($query) => $query->where('school_year', $year)->where('status', $status));
                }
            })->orderBy('name')->paginate(12)->withQueryString()
            ->through(function (Student $student): Student {
                $student->setRelation('clearance', $student->clearances->first());

                return $student->unsetRelation('clearances');
            });

        return Inertia::render('clearances/index', [
            'students' => $students, 'filters' => $filters,
            'counts' => Clearance::statusCountsForYear($year),
        ]);
    }

    public function show(Request $request, Student $student): Response
    {
        $filters = $request->validate(['school_year' => ['nullable', new SchoolYear]]);
        $year = $filters['school_year'] ?? config('clinic.active_school_year');

        return Inertia::render('clearances/show', [
            'student' => $student,
            'record' => $student->clearances()->with('reviewer:id,name')->where('school_year', $year)->first(),
            'school_year' => $year,
            'history' => $student->clearances()->orderByDesc('school_year')->get(['id', 'school_year', 'student_snapshot', 'status', 'reviewed_at']),
        ]);
    }

    public function update(ClearanceRequest $request, Student $student): RedirectResponse
    {
        if ($request->string('status')->toString() === 'cleared' && (! $request->boolean('physical_exam') || ! $request->boolean('documents_received') || ! $request->boolean('xray_verified'))) {
            throw ValidationException::withMessages(['status' => 'Complete all three requirements before issuing medical clearance.']);
        }

        DB::transaction(function () use ($request, $student): void {
            $student = Student::query()->lockForUpdate()->findOrFail($student->id);
            $record = $student->clearances()->firstOrNew(['school_year' => $request->string('school_year')->toString()]);
            $record->fill($request->safe()->except('school_year'));
            if ($record->student_snapshot === null) {
                $record->student_snapshot = $student->clearanceSnapshot();
            }
            $record->fill(['reviewed_by' => $request->user()?->id, 'reviewed_at' => now()])->save();
        }, attempts: 3);

        return back()->with('success', $student->name.'’s '.$request->string('school_year').' clearance has been saved.');
    }
}
