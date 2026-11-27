import test from 'node:test';
import assert from 'node:assert/strict';
import { availability, createInitialState } from '../src/domain.ts';

const now = new Date('2026-11-24T01:00:00Z');
void test('connected availability uses shared counts and never invents demo reservations', () => {
    const state = createInitialState(now);
    state.connected = true;
    state.slots = {
        '2026-11-25': {
            morning: 0,
            afternoon: 2,
            reserved: { morning: 24, afternoon: 22 },
            dailyRemaining: 2,
        },
    };
    assert.deepEqual(
        availability(state, '2026-11-25', now),
        state.slots['2026-11-25'],
    );
    assert.equal(availability(state, '2026-11-26', now).morning, 0);
    assert.equal(availability(state, '2026-11-26', now).afternoon, 0);
});
void test('a connected period closes at its start even if the last snapshot has spare places', () => {
    const state = createInitialState(now);
    state.connected = true;
    state.slots = {
        '2026-11-24': {
            morning: 24,
            afternoon: 24,
            reserved: { morning: 0, afternoon: 0 },
            dailyRemaining: 48,
        },
    };
    assert.equal(
        availability(state, '2026-11-24', new Date('2026-11-24T00:00:00Z'))
            .morning,
        0,
    );
    assert.equal(
        availability(state, '2026-11-24', new Date('2026-11-24T00:00:00Z'))
            .afternoon,
        24,
    );
});
