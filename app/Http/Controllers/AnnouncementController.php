<?php

namespace App\Http\Controllers;

use App\Http\Requests\AnnouncementRequest;
use App\Models\Announcement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AnnouncementController extends Controller
{
    public function index(Request $request): Response
    {
        $search = mb_substr($request->string('search')->toString(), 0, 100);
        $announcements = Announcement::query()->when($search, fn ($query) => $query->where(fn ($query) => $query->where('title', 'like', '%'.$search.'%')->orWhere('body', 'like', '%'.$search.'%')))->latest()->paginate(9)->withQueryString();

        return Inertia::render('announcements/index', [
            'announcements' => $announcements, 'filters' => ['search' => $search],
            'counts' => ['all' => Announcement::query()->count(), 'published' => Announcement::query()->whereNotNull('published_at')->count(), 'draft' => Announcement::query()->whereNull('published_at')->count()],
        ]);
    }

    public function store(AnnouncementRequest $request): RedirectResponse
    {
        Announcement::query()->create([
            'title' => $request->string('title')->toString(), 'body' => $request->string('body')->toString(),
            'audience' => $request->string('audience')->toString(), 'author_id' => $request->user()?->id,
            'published_at' => $request->boolean('published') ? now() : null,
        ]);

        return back()->with('success', $request->boolean('published') ? 'Clinic announcement has been published.' : 'Announcement draft has been saved.');
    }

    public function update(AnnouncementRequest $request, Announcement $announcement): RedirectResponse
    {
        $announcement->update([
            'title' => $request->string('title')->toString(), 'body' => $request->string('body')->toString(),
            'audience' => $request->string('audience')->toString(),
            'published_at' => $request->boolean('published') ? ($announcement->published_at ?? now()) : null,
        ]);

        return back()->with('success', 'Announcement has been updated.');
    }
}
