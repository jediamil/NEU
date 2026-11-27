<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class SchoolYear implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! preg_match('/^(\d{4})-(\d{4})$/', $value, $years) || (int) $years[1] < 1900 || (int) $years[1] > 2199 || (int) $years[2] !== (int) $years[1] + 1) {
            $fail('Use consecutive school years, for example 2026-2027.');
        }
    }
}
