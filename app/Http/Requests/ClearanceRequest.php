<?php

namespace App\Http\Requests;

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
            'status' => ['required', Rule::in(['pending', 'incomplete', 'cleared'])],
            'physical_exam' => ['required', 'boolean'],
            'documents_received' => ['required', 'boolean'],
            'xray_verified' => ['required', 'boolean'],
            'notes' => ['nullable', 'string', 'max:3000'],
        ];
    }
}
