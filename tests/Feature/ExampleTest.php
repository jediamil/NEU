<?php

test('the staff entry point redirects guests to sign in', function () {
    $response = $this->get(route('home'));

    $response->assertRedirect(route('login'));
});
