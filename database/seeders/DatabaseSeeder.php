<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\Appointment;
use App\Models\ClinicSchedule;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        $clinic = User::query()->firstOrCreate(['email' => 'clinic@neu.test'], ['name' => 'Sofia Mendoza', 'password' => Hash::make('Prototype123!')]);
        $clinic->forceFill(['role' => 'clinic', 'email_verified_at' => $clinic->email_verified_at ?? now()])->save();
        $registrar = User::query()->firstOrCreate(['email' => 'registrar@neu.test'], ['name' => 'Registrar Demo', 'password' => Hash::make('Prototype123!')]);
        $registrar->forceFill(['role' => 'registrar', 'email_verified_at' => $registrar->email_verified_at ?? now()])->save();

        $names = ['Amelia Santos', 'Gabriel Reyes', 'Isabella Cruz', 'Lucas Garcia', 'Sophia Ramos', 'Ethan Mendoza', 'Olivia Torres', 'Liam Flores', 'Chloe Navarro', 'Noah Aquino', 'Mia Villanueva', 'Caleb Bautista', 'Sofia Castillo', 'Elijah Rivera', 'Ava Santiago', 'Nathan Lim', 'Julia Dela Cruz', 'Daniel Tan', 'Zoe Fernandez', 'Matthew Gonzales', 'Hannah Mercado', 'Joshua Valdez', 'Ella Pascual', 'Adrian Romero', 'Leah Salazar', 'Miguel Soriano', 'Grace Domingo', 'Joaquin Perez', 'Luna Aguilar', 'Sebastian Yap'];
        $programs = ['BS Information Systems', 'BS Information Technology', 'BS Computer Science', 'BS Nursing', 'BS Accountancy', 'BS Psychology'];
        $students = collect($names)->map(function (string $name, int $index) use ($programs, $clinic): Student {
            $student = Student::query()->firstOrCreate(['student_number' => '2026-'.str_pad((string) (10001 + $index), 5, '0', STR_PAD_LEFT)], [
                'name' => $name, 'email' => Str::slug($name, '.').'@students.neu.test',
                'program' => $programs[$index % count($programs)], 'year_level' => ($index % 4) + 1,
            ]);
            $status = $index % 5 < 2 ? 'cleared' : ($index % 5 === 2 ? 'incomplete' : 'pending');
            $student->clearance()->firstOrCreate(['student_id' => $student->id], [
                'status' => $status, 'physical_exam' => $status !== 'pending', 'documents_received' => $status === 'cleared', 'xray_verified' => $status === 'cleared',
                'notes' => $status === 'incomplete' ? 'Please bring the remaining enrollment documents for verification.' : null,
                'reviewed_by' => $status !== 'pending' ? $clinic->id : null, 'reviewed_at' => $status !== 'pending' ? now()->subDay() : null,
            ]);

            return $student;
        });

        for ($offset = -2; $offset <= 20; $offset++) {
            $date = now()->addDays($offset);
            if ($date->isWeekend()) {
                continue;
            }
            $schedule = ClinicSchedule::query()->firstOrCreate(['date' => $date->toDateString()], [
                'opening_time' => '08:00', 'closing_time' => '17:00', 'slot_minutes' => 30,
                'slot_capacity' => 3, 'daily_capacity' => 40, 'is_open' => true,
            ]);
            $schedule->generateSlots();
            $slots = $schedule->slots()->orderBy('starts_at')->get();
            if ($slots->isEmpty() || $offset > 9) {
                continue;
            }

            for ($i = 0; $i < 8; $i++) {
                $slot = $slots[($i * 2) % $slots->count()];
                $status = $offset < 0 ? ($i === 7 ? 'no_show' : 'completed') : ($offset === 0 ? ($i < 2 ? 'completed' : ($i < 4 ? 'checked_in' : 'scheduled')) : 'scheduled');
                Appointment::query()->firstOrCreate(['reference' => 'NEU-DEMO-'.$date->format('ymd').'-'.str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT)], [
                    'student_id' => $students[(($offset + 2) * 8 + $i) % $students->count()]->id,
                    'appointment_slot_id' => $slot->id, 'created_by' => $clinic->id,
                    'service' => array_keys(Appointment::SERVICES)[$i % 3], 'status' => $status,
                    'checked_in_at' => in_array($status, ['checked_in', 'completed'], true) ? $slot->starts_at : null,
                    'completed_at' => $status === 'completed' ? $slot->ends_at : null,
                ]);
            }
        }

        foreach ([
            ['Enrollment health clearance is now open', 'Plan your clinic visit ahead of time. Bring your completed medical index card and the documents required for your enrollment health clearance.', true],
            ['A little preparation makes your visit easier', 'Have your appointment reference ready when you arrive. Our clinic team will verify your booking and guide you through your requirements.', true],
            ['Clinic hours and midday break', 'The clinic appointment schedule runs on weekdays, with a midday break from 12:00 PM to 1:00 PM. Check available slots before planning your visit.', true],
            ['Upcoming enrollment clinic advisory', 'A new advisory will be published here once the next enrollment clinic schedule is confirmed.', false],
        ] as [$title, $body, $published]) {
            Announcement::query()->firstOrCreate(['title' => $title], ['body' => $body, 'audience' => 'students', 'author_id' => $clinic->id, 'published_at' => $published ? now()->subDay() : null]);
        }
    }
}
