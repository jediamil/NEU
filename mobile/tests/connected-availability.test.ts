import test from 'node:test';
import assert from 'node:assert/strict';
import { availability, bookVisit, createInitialState } from '../src/domain.ts';

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
void test('an open Sunday is bookable during the afternoon until 4 PM Philippine time', () => {
    const duringPeriod = new Date('2026-11-29T05:56:00Z');
    const atCutoff = new Date('2026-11-29T08:00:00Z');
    const state = createInitialState(duringPeriod);
    state.connected = true;
    state.slots = {
        '2026-11-29': {
            morning: 24,
            afternoon: 24,
            reserved: { morning: 0, afternoon: 0 },
            dailyRemaining: 48,
        },
    };
    const input = {
        date: '2026-11-29',
        period: 'afternoon',
        service: 'physical_exam',
        notes: '',
    } as const;
    assert.equal(availability(state, input.date, duringPeriod).morning, 0);
    assert.equal(availability(state, input.date, duringPeriod).afternoon, 24);
    assert.ok(
        bookVisit(state, input, duringPeriod).visits.some(
            (visit) =>
                visit.date === input.date && visit.period === input.period,
        ),
    );
    assert.equal(availability(state, input.date, atCutoff).afternoon, 0);
    assert.throws(() => bookVisit(state, input, atCutoff), /has ended/);
});

void test('connected availability applies a staff cutoff to a previously loaded schedule', () => {
    const state = createInitialState(now);
    state.connected = true;
    const date = '2026-11-25';
    state.slots = {
        [date]: {
            morning: 24,
            afternoon: 24,
            reserved: { morning: 0, afternoon: 0 },
            dailyRemaining: 48,
            bookingCutoff: '14:30:00',
        },
    };
    const before = new Date('2026-11-25T06:29:59Z');
    const cutoff = new Date('2026-11-25T06:30:00Z');
    assert.equal(availability(state, date, before).afternoon, 24);
    assert.equal(availability(state, date, cutoff).afternoon, 0);
    assert.throws(
        () =>
            bookVisit(
                state,
                {
                    date,
                    period: 'afternoon',
                    service: 'physical_exam',
                    notes: '',
                },
                cutoff,
            ),
        /has ended/,
    );
});
