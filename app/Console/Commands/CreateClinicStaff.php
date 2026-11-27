<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

#[Signature('clinic:create-staff {email} {--name=Clinic Administrator} {--role=clinic}')]
#[Description('Create a staff login without seeding sample clinic records')]
class CreateClinicStaff extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = mb_strtolower((string) $this->argument('email'));
        $password = config('clinic.bootstrap_password');
        if (! is_string($password) && $this->input->isInteractive()) {
            $password = $this->secret('Initial password');
        }
        $data = ['email' => $email, 'password' => $password, 'name' => $this->option('name'), 'role' => $this->option('role')];
        $validator = Validator::make($data, [
            'email' => ['required', 'email', 'max:150'],
            'name' => ['required', 'string', 'max:150'],
            'password' => ['required', 'string', 'min:8', 'max:128'],
            'role' => ['required', 'in:clinic,registrar'],
        ]);
        if ($validator->fails()) {
            $this->error('Provide a valid email, name, role and initial password (CLINIC_BOOTSTRAP_PASSWORD in noninteractive mode).');

            return self::FAILURE;
        }
        if (User::query()->where('email', $email)->exists()) {
            $this->error('That staff account already exists; no credentials were changed.');

            return self::FAILURE;
        }
        $user = new User(['name' => $data['name'], 'email' => $email, 'password' => $password]);
        $user->forceFill(['role' => $data['role'], 'email_verified_at' => now()])->save();
        $this->info('Staff account created. No sample clinic data was inserted.');

        return self::SUCCESS;
    }
}
