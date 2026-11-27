<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class RealtimeController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate(['user_id' => ['required', 'integer'], 'role' => ['required', 'string']]);
        $user = $request->user();
        abort_unless($user !== null && $user->id === (int) $data['user_id'] && $user->role === $data['role'], 409, 'Your staff session changed. Reload this page.');
        $url = config('services.neon.function_url');
        $secret = config('services.neon.portal_secret');
        abort_unless(is_string($url) && $url !== '' && is_string($secret) && $secret !== '', 503, 'Live updates are not configured.');
        try {
            $response = Http::connectTimeout(3)->timeout(8)->withToken($secret)->post(rtrim($url, '/').'/internal/portal-live', ['userId' => $user->id, 'role' => $user->role]);
        } catch (ConnectionException) {
            abort(503, 'Live updates are temporarily unavailable.');
        }
        abort_unless($response->successful(), 503, 'Live updates are temporarily unavailable.');

        return response()->json($response->json())->header('Cache-Control', 'no-store');
    }
}
