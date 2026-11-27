import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    availability,
    bookingDates,
    bookVisit,
    campusDate,
    cancelVisit,
    createInitialState,
    demoReservations,
    restoreState,
    updateContact,
} from '../src/domain.ts';
import type { Service } from '../src/domain.ts';

const now = new Date('2026-11-24T01:00:00.000Z');

test('campus dates use Philippine time at a UTC date boundary', () => {
    assert.equal(campusDate(new Date('2026-11-24T16:30:00Z')), '2026-11-25');
});
test('booking window includes weekends and can be restricted for demo dates', () => {
    const dates = bookingDates(now);
    assert.equal(dates[0], '2026-11-24');
    assert.equal(dates.at(-1), '2026-12-22');
    assert.equal(dates.includes('2026-11-28'), true);
    assert.equal(dates.includes('2026-11-29'), true);
    assert.equal(bookingDates(now, false).includes('2026-11-29'), false);
});
for (const service of [
    'physical_exam',
    'xray_verification',
    'dental_consultation',
    'tooth_extraction',
] as Service[]) {
    test(
        'books ' + service + ' and retains its date period and reference',
        () => {
            const original = createInitialState(now);
            const next = bookVisit(
                original,
                {
                    date: '2026-11-26',
                    period: 'morning',
                    service,
                    notes: '  Demo note  ',
                },
                now,
                'BOOK12345',
            );
            assert.equal(next.visits[0].reference, 'NEU-P-261126-12345');
            assert.equal(next.visits[0].status, 'scheduled');
            assert.equal(next.visits[0].service, service);
            assert.equal(next.visits[0].notes, 'Demo note');
            assert.equal(next.visits.length, original.visits.length + 1);
            assert.deepEqual(next.clearances, original.clearances);
        },
    );
}
for (const date of ['2026-11-23', '2026-11-28', '2027-01-10', 'not-a-date']) {
    test('rejects closed or out-of-range date ' + date, () => {
        const state = createInitialState(now);
        assert.throws(
            () =>
                bookVisit(
                    state,
                    {
                        date,
                        period: 'morning',
                        service: 'physical_exam',
                        notes: '',
                    },
                    now,
                ),
            /open clinic date/,
        );
        assert.equal(state.visits.length, 2);
    });
}
test('a booking period closes exactly at its end time', () => {
    const atEnd = new Date('2026-11-24T08:00:00Z');
    assert.throws(
        () =>
            bookVisit(
                createInitialState(atEnd),
                {
                    date: '2026-11-24',
                    period: 'afternoon',
                    service: 'physical_exam',
                    notes: '',
                },
                atEnd,
            ),
        /has ended/,
    );
});
test('another service cannot be booked in a period already occupied by this student', () => {
    const state = createInitialState(now);
    const existing = state.visits[0];
    assert.throws(
        () =>
            bookVisit(
                state,
                {
                    date: existing.date,
                    period: existing.period,
                    service: 'dental_consultation',
                    notes: '',
                },
                now,
            ),
        /already have an appointment/,
    );
});
test('a full period rejects a reservation without modifying state', () => {
    const state = createInitialState(now);
    const date = bookingDates(now).find(
        (date) => date > '2026-11-24' && demoReservations(date).morning === 24,
    )!;
    assert.ok(date);
    assert.equal(availability(state, date, now).morning, 0);
    assert.throws(
        () =>
            bookVisit(
                state,
                {
                    date,
                    period: 'morning',
                    service: 'physical_exam',
                    notes: '',
                },
                now,
            ),
        /period is full/,
    );
    assert.equal(state.visits.length, 2);
});
test('cancellation retains history and releases one place', () => {
    const state = createInitialState(now);
    const visit = state.visits[0];
    const before = availability(state, visit.date, now).morning;
    const next = cancelVisit(state, visit.id, now);
    assert.equal(next.visits[0].status, 'cancelled');
    assert.equal(next.visits[0].reference, visit.reference);
    assert.equal(next.visits.length, state.visits.length);
    assert.equal(availability(next, visit.date, now).morning, before + 1);
    assert.equal(state.visits[0].status, 'scheduled');
});
test('a cancelled place can be rebooked with a different service', () => {
    const state = createInitialState(now);
    const visit = state.visits[0];
    const cancelled = cancelVisit(state, visit.id, now);
    const next = bookVisit(
        cancelled,
        {
            date: visit.date,
            period: visit.period,
            service: 'tooth_extraction',
            notes: '',
        },
        now,
        'REBOOK123',
    );
    assert.equal(next.visits[0].service, 'tooth_extraction');
    assert.equal(next.visits[1].status, 'cancelled');
});
test('completed or already-cancelled appointments cannot be cancelled', () => {
    const state = createInitialState(now);
    assert.throws(
        () => cancelVisit(state, state.visits[1].id, now),
        /Only scheduled/,
    );
    const next = cancelVisit(state, state.visits[0].id, now);
    assert.throws(
        () => cancelVisit(next, state.visits[0].id, now),
        /Only scheduled/,
    );
});
test('a started visit cannot be cancelled', () => {
    const state = createInitialState(now);
    assert.throws(
        () =>
            cancelVisit(
                state,
                state.visits[0].id,
                new Date('2026-12-24T00:00:00Z'),
            ),
        /period has started/,
    );
});
test('contact edits preserve student identity and previous-year snapshots', () => {
    const state = createInitialState(now);
    const next = updateContact(state, {
        name: '  Sam Rivera ',
        email: 'sam@example.test',
        phone: '09123456789',
    });
    assert.equal(next.profile.name, 'Sam Rivera');
    assert.equal(next.profile.studentNumber, state.profile.studentNumber);
    assert.equal(next.profile.yearLevel, 2);
    assert.deepEqual(next.clearances, state.clearances);
    assert.equal(next.clearances[1].yearLevel, 1);
});
test('invalid contact information is rejected without changing saved values', () => {
    const state = createInitialState(now);
    assert.throws(
        () => updateContact(state, { name: 'A', email: 'bad', phone: '' }),
        /name between/,
    );
    assert.throws(
        () => updateContact(state, { name: 'Alex', email: 'bad', phone: '' }),
        /valid email/,
    );
    assert.equal(state.profile.name, 'Alex Rivera');
});
test('local storage round trips bookings history profile and theme', () => {
    const state = createInitialState(now);
    const next = {
        ...state,
        started: true,
        theme: 'dark' as const,
        readAnnouncements: ['clearance'],
    };
    assert.deepEqual(restoreState(JSON.stringify(next)), next);
});
for (const raw of [
    'invalid json',
    'null',
    '{"version":2}',
    '{"version":1,"started":true}',
]) {
    test('invalid local storage fails explicitly: ' + raw, () => {
        assert.throws(() => restoreState(raw));
    });
}
test('unsupported legacy services are rejected', () => {
    assert.throws(
        () =>
            bookVisit(
                createInitialState(now),
                {
                    date: '2026-11-26',
                    period: 'morning',
                    service: 'document_submission' as Service,
                    notes: '',
                },
                now,
            ),
        /available clinic service/,
    );
});

test('one multi-service visit reserves the entire date until it is cancelled', () => {
    const state = { ...createInitialState(now), visits: [] };
    const date = '2026-11-26';
    const next = bookVisit(
        state,
        {
            date,
            period: 'afternoon',
            services: ['xray_verification', 'medical_clearance_submission'],
            notes: '',
        },
        now,
        'afternoon-visit',
    );
    assert.equal(next.visits.length, 1);
    assert.deepEqual(next.visits[0].services, [
        'xray_verification',
        'medical_clearance_submission',
    ]);
    const morning = {
        date,
        period: 'morning',
        service: 'physical_exam',
        notes: '',
    } as const;
    assert.throws(() => bookVisit(next, morning, now), /Cancel it/);
    const cancelled = cancelVisit(next, 'afternoon-visit', now);
    assert.equal(
        bookVisit(cancelled, morning, now).visits[0].period,
        'morning',
    );
});
