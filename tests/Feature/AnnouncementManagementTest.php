<?php

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

function announcementImage(string $name): UploadedFile
{
    return UploadedFile::fake()->createWithContent($name, (string) base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+c+e8AAAAASUVORK5CYII=', true));
}

test('staff can upload replace and delete an announcement image', function () {
    $disk = Storage::fake('local');
    $payload = ['title' => 'Clinic notice', 'body' => 'Bring your requirements.', 'audience' => 'staff', 'published' => false];

    $this->actingAs(User::factory()->create())->post(route('announcements.store'), [
        ...$payload, 'image' => announcementImage('notice.png'),
    ])->assertRedirect()->assertSessionHasNoErrors();
    $announcement = Announcement::query()->sole();
    $firstImage = $announcement->image_path;
    expect($firstImage)->not->toBeNull();
    $disk->assertExists($firstImage);

    $this->get(route('announcements.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('announcements.data.0.image_url', fn (string $url) => str_starts_with($url, route('announcements.image', $announcement, absolute: false).'?v='))
        ->missing('announcements.data.0.image_path'));
    $this->get(route('announcements.image', $announcement))->assertOk()->assertHeader('Content-Type', 'image/png');

    $this->patch(route('announcements.update', $announcement), [...$payload, 'title' => 'Updated notice'])
        ->assertSessionHasNoErrors();
    expect($announcement->refresh()->image_path)->toBe($firstImage);

    $this->post(route('announcements.update', $announcement), [
        ...$payload, '_method' => 'PATCH', 'image' => announcementImage('replacement.png'),
    ])->assertSessionHasNoErrors();
    $disk->assertMissing($firstImage);
    $replacement = $announcement->refresh()->image_path;
    expect($replacement)->not->toBeNull();
    $disk->assertExists($replacement);

    $this->delete(route('announcements.destroy', $announcement))->assertRedirect();
    $this->assertModelMissing($announcement);
    $disk->assertMissing($replacement);
});

test('announcement uploads reject unsupported content', function () {
    Storage::fake('local');
    $this->actingAs(User::factory()->create())->post(route('announcements.store'), [
        'title' => 'Clinic notice', 'body' => 'Test', 'audience' => 'students', 'published' => false,
        'image' => UploadedFile::fake()->createWithContent('notice.png', 'not an image'),
    ])->assertSessionHasErrors('image');

    $this->assertDatabaseCount('announcements', 0);
});

test('registrars cannot view private announcement images or delete announcements', function () {
    $announcement = Announcement::factory()->create();

    $this->actingAs(User::factory()->create(['role' => 'registrar']))
        ->get(route('announcements.image', $announcement))->assertForbidden();
    $this->delete(route('announcements.destroy', $announcement))->assertForbidden();

    $this->assertModelExists($announcement);
});
