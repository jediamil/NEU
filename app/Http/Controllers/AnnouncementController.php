<?php

namespace App\Http\Controllers;

use App\Http\Requests\AnnouncementRequest;
use App\Models\Announcement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class AnnouncementController extends Controller
{
    public function index(Request $request): Response
    {
        $search = mb_substr($request->string('search')->toString(), 0, 100);
        $announcements = Announcement::query()->when($search, fn ($query) => $query->where(fn ($query) => $query->where('title', 'like', '%'.$search.'%')->orWhere('body', 'like', '%'.$search.'%')))->latest()->paginate(9)->withQueryString()->through(fn (Announcement $announcement) => [
            ...$announcement->toArray(),
            'image_url' => $announcement->image_path ? route('announcements.image', ['announcement' => $announcement, 'v' => hash('sha256', $announcement->image_path)], absolute: false) : null,
        ]);
        $counts = Announcement::query()->toBase()->selectRaw('COUNT(*) AS total, COUNT(published_at) AS published')->first();

        return Inertia::render('announcements/index', [
            'announcements' => $announcements, 'filters' => ['search' => $search],
            'counts' => ['all' => (int) $counts->total, 'published' => (int) $counts->published, 'draft' => (int) $counts->total - (int) $counts->published],
        ]);
    }

    public function store(AnnouncementRequest $request): RedirectResponse
    {
        $path = $this->storeImage($request);
        try {
            Announcement::query()->create([
                ...$request->safe()->only(['title', 'body', 'audience']),
                'author_id' => $request->user()?->id,
                'published_at' => $request->boolean('published') ? now() : null,
                'image_path' => $path,
            ]);
        } catch (Throwable $exception) {
            if ($path !== null) {
                Storage::disk('local')->delete($path);
            }

            throw $exception;
        }

        return back()->with('success', $request->boolean('published') ? 'Clinic announcement has been published.' : 'Announcement draft has been saved.');
    }

    public function update(AnnouncementRequest $request, Announcement $announcement): RedirectResponse
    {
        $path = $this->storeImage($request);
        try {
            $oldPath = DB::transaction(function () use ($request, $announcement, $path): ?string {
                $current = Announcement::query()->lockForUpdate()->findOrFail($announcement->id);
                $oldPath = $current->image_path;
                $current->update([
                    ...$request->safe()->only(['title', 'body', 'audience']),
                    'published_at' => $request->boolean('published') ? ($current->published_at ?? now()) : null,
                    'image_path' => $path ?? $oldPath,
                ]);

                return $oldPath;
            });
        } catch (Throwable $exception) {
            if ($path !== null) {
                Storage::disk('local')->delete($path);
            }

            throw $exception;
        }

        if ($path !== null && $oldPath !== null) {
            Storage::disk('local')->delete($oldPath);
        }

        return back()->with('success', 'Announcement has been updated.');
    }

    public function image(Announcement $announcement): StreamedResponse
    {
        $disk = Storage::disk('local');
        abort_unless($announcement->image_path && $disk->exists($announcement->image_path), 404);

        return $disk->response($announcement->image_path, headers: [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function destroy(Announcement $announcement): RedirectResponse
    {
        $path = DB::transaction(function () use ($announcement): ?string {
            $current = Announcement::query()->lockForUpdate()->findOrFail($announcement->id);
            $current->delete();

            return $current->image_path;
        });
        if ($path !== null) {
            Storage::disk('local')->delete($path);
        }

        return back()->with('success', 'Announcement has been deleted.');
    }

    private function storeImage(AnnouncementRequest $request): ?string
    {
        $image = $request->file('image');
        if ($image === null) {
            return null;
        }

        $path = $image->store('announcements', 'local');
        if ($path === false) {
            throw ValidationException::withMessages(['image' => 'The image could not be saved. Try uploading it again.']);
        }

        return $path;
    }
}
