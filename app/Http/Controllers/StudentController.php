<?php

namespace App\Http\Controllers;

use App\Http\Requests\StudentRequest;
use App\Models\Appointment;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    public function index(Request $request): Response
    {
        $search = mb_substr($request->string('search')->toString(), 0, 100);
        $students = Student::query()->with('clearance')
            ->when($search, fn ($query) => $query->where(fn ($query) => $query->where('name', 'like', '%'.$search.'%')->orWhere('student_number', 'like', '%'.$search.'%')->orWhere('program', 'like', '%'.$search.'%')))
            ->orderBy('name')->paginate(12)->withQueryString();

        return Inertia::render('students/index', ['students' => $students, 'filters' => ['search' => $search], 'total' => Student::query()->count()]);
    }

    public function show(Student $student): Response
    {
        return Inertia::render('students/show', [
            'student' => $student->load('clearance'),
            'appointments' => $student->appointments()->with(['student', 'slot'])->latest()->get()->map(fn (Appointment $appointment) => $appointment->summary()),
        ]);
    }

    public function store(StudentRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $student = Student::query()->create($request->validated());
            $student->clearance()->create(['status' => 'pending']);
        });

        return back()->with('success', 'Student record has been created.');
    }

    public function update(StudentRequest $request, Student $student): RedirectResponse
    {
        $student->update($request->validated());

        return back()->with('success', $student->name.'’s record has been updated.');
    }
}
