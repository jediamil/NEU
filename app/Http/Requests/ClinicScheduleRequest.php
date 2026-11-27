<?php

namespace App\Http\Requests;

use App\Models\ClinicSchedule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClinicScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'clinic';
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $schedule = $this->route('schedule');

        return [
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today', Rule::unique('clinic_schedules')->ignore($schedule instanceof ClinicSchedule ? $schedule->id : null)],
            'morning_capacity' => ['required', 'integer', 'between:0,1000'],
            'afternoon_capacity' => ['required', 'integer', 'between:0,1000'],
            'daily_capacity' => ['required', 'integer', 'between:1,1000'],
            'is_open' => ['required', 'boolean'],
        ];
    }
}
