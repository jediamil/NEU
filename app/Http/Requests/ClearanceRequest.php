<?php

namespace App\Http\Requests;

use App\Rules\SchoolYear;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClearanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'clinic';
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'school_year' => ['required', new SchoolYear],
            'status' => ['required', Rule::in(['pending', 'incomplete', 'cleared'])],
            'physical_exam' => ['required', 'boolean'],
            'documents_received' => ['required', 'boolean'],
            'xray_verified' => ['required', 'boolean'],
            'notes' => ['nullable', 'string', 'max:3000'],
            'exam_data' => ['sometimes', 'array:height_cm,weight_kg,bp_systolic,bp_diastolic,temperature_c,eye_left,eye_right,last_menstrual_period,has_cough,has_colds,has_allergies,allergy_details,physician_notes'],
            'exam_data.height_cm' => ['nullable', 'numeric', 'gt:0'],
            'exam_data.weight_kg' => ['nullable', 'numeric', 'gt:0'],
            'exam_data.bp_systolic' => ['nullable', 'integer', 'gt:0'],
            'exam_data.bp_diastolic' => ['nullable', 'integer', 'gt:0'],
            'exam_data.temperature_c' => ['nullable', 'numeric', 'gt:0'],
            'exam_data.eye_left' => ['nullable', 'string', 'max:50'],
            'exam_data.eye_right' => ['nullable', 'string', 'max:50'],
            'exam_data.last_menstrual_period' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'exam_data.has_cough' => ['nullable', 'boolean'],
            'exam_data.has_colds' => ['nullable', 'boolean'],
            'exam_data.has_allergies' => ['nullable', 'boolean'],
            'exam_data.allergy_details' => ['nullable', 'string', 'max:1000'],
            'exam_data.physician_notes' => ['nullable', 'string', 'max:3000'],
        ];
    }
}
