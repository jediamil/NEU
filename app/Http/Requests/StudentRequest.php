<?php

namespace App\Http\Requests;

use App\Models\Student;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'clinic';
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $student = $this->route('student');

        return [
            'student_number' => ['required', 'string', 'max:30', Rule::unique('students')->ignore($student instanceof Student ? $student->id : null)],
            'name' => ['required', 'string', 'max:150'],
            'email' => ['nullable', 'email', 'max:150'],
            'program' => ['required', 'string', 'max:120'],
            'college' => ['nullable', 'string', 'max:150'],
            'year_level' => ['required', 'integer', 'between:1,6'],
            'age' => ['nullable', 'integer', 'between:1,130'],
            'section' => ['nullable', 'string', 'max:60'],
        ];
    }
}
