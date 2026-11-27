<?php

use App\Models\User;
use Illuminate\Http\Client\Request as OutboundRequest;
use Illuminate\Support\Facades\Http;

test('live subscriptions require an authenticated verified staff session', function () {
    Http::preventStrayRequests();
    $this->postJson(route('realtime.subscription'), [])->assertUnauthorized();
    $unverified = User::factory()->unverified()->create();
    $this->actingAs($unverified)->postJson(route('realtime.subscription'), ['user_id' => $unverified->id, 'role' => 'clinic'])->assertForbidden();
    Http::assertNothingSent();
});

test('unknown staff roles cannot obtain live subscriptions', function () {
    Http::preventStrayRequests();
    $user = User::factory()->create(['role' => 'unknown']);

    $this->actingAs($user)->postJson(route('realtime.subscription'), ['user_id' => $user->id, 'role' => 'unknown'])->assertForbidden();

    Http::assertNothingSent();
});

test('live subscriptions seal the current staff identity and role instead of browser-supplied scope', function (string $role) {
    $user = User::factory()->create(['role' => $role]);
    config(['services.neon.function_url' => 'https://neon-api.example', 'services.neon.portal_secret' => 'private-test-key']);
    Http::preventStrayRequests();
    Http::fake(['https://neon-api.example/internal/portal-live' => Http::response(['sealedQuery' => 'opaque', 'expiresAt' => 12345])]);

    $this->actingAs($user)->postJson(route('realtime.subscription'), ['user_id' => $user->id, 'role' => $role, 'sql' => 'SELECT private_notes', 'scope' => 'everything'])
        ->assertOk()->assertExactJson(['sealedQuery' => 'opaque', 'expiresAt' => 12345])->assertHeader('Cache-Control', 'no-store, private');

    Http::assertSent(fn (OutboundRequest $request) => $request->hasHeader('Authorization', 'Bearer private-test-key') && $request->data() === ['userId' => $user->id, 'role' => $role]);
})->with(['clinic', 'registrar']);

test('an old page cannot renew a subscription after its staff identity or role changes', function (bool $changeRole) {
    Http::preventStrayRequests();
    $user = User::factory()->create(['role' => 'registrar']);

    $this->actingAs($user)->postJson(route('realtime.subscription'), ['user_id' => $changeRole ? $user->id : $user->id + 1, 'role' => $changeRole ? 'clinic' : 'registrar'])->assertConflict();

    Http::assertNothingSent();
})->with([false, true]);

test('upstream live failures return a safe unavailable response', function () {
    $user = User::factory()->create();
    config(['services.neon.function_url' => 'https://neon-api.example', 'services.neon.portal_secret' => 'private-test-key']);
    Http::preventStrayRequests();
    Http::fake(['https://neon-api.example/internal/portal-live' => Http::response(['error' => 'private upstream detail'], 500)]);

    $this->actingAs($user)->postJson(route('realtime.subscription'), ['user_id' => $user->id, 'role' => $user->role])
        ->assertServiceUnavailable()->assertJsonPath('message', 'Live updates are temporarily unavailable.')->assertDontSee('private upstream detail');

    Http::assertSentCount(1);
});
