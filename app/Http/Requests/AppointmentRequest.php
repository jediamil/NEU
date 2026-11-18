<?php

namespace App\Http\Requests;

use App\Models\Appointment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'clinic';
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'appointment_slot_id' => ['required', 'integer', 'exists:appointment_slots,id'],
            'service' => ['required', Rule::in(array_keys(Appointment::SERVICES))],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
