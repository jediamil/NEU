import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createRealtimeClient } from '@neon/realtime/client';
import type { SealedLiveQuery } from '@neon/realtime/client';
import { Pool } from 'pg';
import { bookingDates } from '../src/domain.ts';
import { WebSession } from './web-session.ts';

const base = process.env.EXPO_PUBLIC_NEU_API_URL!;
type Session = { credential: string; token: string; user: { id: string } };
async function call(
    path: string,
    session?: Session,
    body?: unknown,
    method = body === undefined ? 'GET' : 'POST',
) {
    const response = await fetch(base.replace(/\/$/, '') + path, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(session
                ? {
                      Authorization: 'Bearer ' + session.token,
                      'X-Neu-Session': session.credential,
                  }
                : {}),
        },
        ...(body === undefined || method === 'GET'
            ? {}
            : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(60000),
    });
    const data = await response.json();
    return { status: response.status, data };
}
void test(
    'deployed Neon student flows, isolation, capacity, Realtime, and AI availability',
    { timeout: 240000 },
    async (t) => {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL!.replace(
                'sslmode=require',
                'sslmode=verify-full',
            ),
            max: 2,
        });
        const dates = bookingDates();
        const date = dates.at(-1)!;
        const suffix = randomUUID().slice(0, 8);
        const users = [1, 2].map((n) => ({
            email: `neu-live-${suffix}-${n}@example.test`,
            password: randomUUID() + '!aA7',
            name: 'NEU Prototype Test ' + n,
        }));
        const sessions: Session[] = [];
        const web = new WebSession();
        const announcementIds: string[] = [];
        const client = createRealtimeClient({
            url: process.env.NEON_REALTIME_URL!,
        });
        let stop: (() => void) | undefined;
        let originalSchedule: Record<string, unknown> | undefined;
        let scheduleChanged = false;
        try {
            await t.test(
                'Function is running; unauthenticated and forged JWT requests are denied',
                async () => {
                    const login = await web.login();
                    assert.ok(
                        [200, 204, 302].includes(login.status),
                        'Staff Fortify login failed: ' + login.status,
                    );
                    const portal = await web.request('/dashboard');
                    assert.equal(portal.status, 200);
                    assert.equal(
                        portal.data.props.auth.user.email,
                        process.env.NEU_WEB_EMAIL,
                    );
                    assert.equal((await call('/health')).status, 200);
                    assert.equal((await call('/api/v1/state')).status, 401);
                    assert.equal(
                        (
                            await call('/api/v1/state', {
                                token: 'forged',
                                credential: 'fake',
                                user: { id: 'fake' },
                            })
                        ).status,
                        401,
                    );
                },
            );
            await t.test(
                'Neon Auth signs up two isolated users, rejects bad credentials, signs out and restores a session',
                async () => {
                    for (const user of users) {
                        const created = await call(
                            '/auth/sign-up',
                            undefined,
                            user,
                        );
                        assert.equal(
                            created.status,
                            200,
                            JSON.stringify(created.data),
                        );
                        assert.ok(created.data.token);
                        assert.ok(created.data.credential);
                        sessions.push(created.data);
                    }
                    assert.equal(
                        (
                            await call('/auth/sign-in', undefined, {
                                email: users[0].email,
                                password: 'DefinitelyWrong!2026',
                            })
                        ).status,
                        401,
                    );
                    assert.equal(
                        (await call('/auth/sign-out', sessions[0], {})).status,
                        200,
                    );
                    assert.equal(
                        (await call('/auth/refresh', sessions[0], {})).status,
                        401,
                    );
                    const loggedIn = await call(
                        '/auth/sign-in',
                        undefined,
                        users[0],
                    );
                    assert.equal(loggedIn.status, 200);
                    sessions[0] = loggedIn.data;
                    const refreshed = await call(
                        '/auth/refresh',
                        sessions[0],
                        {},
                    );
                    assert.equal(refreshed.status, 200);
                    assert.ok(refreshed.data.token);
                    sessions[0].token = refreshed.data.token;
                },
            );
            await t.test(
                'Postgres persists profiles and pending clearances; clinical writes and impersonation are rejected',
                async () => {
                    for (const session of sessions) {
                        const state = await call('/api/v1/state', session);
                        assert.equal(state.status, 200);
                        assert.equal(
                            state.data.clearances[0].status,
                            'pending',
                        );
                        assert.equal(state.data.clearances[0].exam, null);
                        assert.equal(state.data.visits.length, 0);
                    }
                    assert.equal(
                        (
                            await call(
                                '/api/v1/profile',
                                sessions[0],
                                { phone: '+639171234567' },
                                'PATCH',
                            )
                        ).status,
                        200,
                    );
                    assert.equal(
                        (await call('/api/v1/state', sessions[0])).data.profile
                            .phone,
                        '+639171234567',
                    );
                    assert.equal(
                        (await call('/api/v1/state', sessions[1])).data.profile
                            .phone,
                        '',
                    );
                    assert.equal(
                        (
                            await call(
                                '/api/v1/profile',
                                sessions[0],
                                { student_number: 'forged', status: 'cleared' },
                                'PATCH',
                            )
                        ).status,
                        422,
                    );
                    assert.equal(
                        (
                            await call('/api/v1/state', {
                                ...sessions[0],
                                token: sessions[1].token,
                            })
                        ).status,
                        401,
                    );
                },
            );
            await t.test(
                'Realtime streams a Postgres change using the authenticated sealed query',
                async () => {
                    const sealed = await call('/api/v1/live', sessions[0], {});
                    assert.equal(sealed.status, 200);
                    const subscription = client.subscribe(
                        sealed.data as SealedLiveQuery<{
                            id: string;
                            revision: string;
                        }>,
                    );
                    stop = () => subscription.unsubscribe();
                    let initial: string | undefined;
                    let resolveChanged: () => void = () => {};
                    const changed = new Promise<void>((resolve, reject) => {
                        resolveChanged = resolve;
                        const timeout = setTimeout(
                            () =>
                                reject(
                                    new Error(
                                        'Realtime did not stream the committed Postgres change within 25 seconds',
                                    ),
                                ),
                            25000,
                        );
                        subscription.onChange((snapshot) => {
                            if (snapshot.status === 'error') {
                                clearTimeout(timeout);
                                reject(
                                    new Error(
                                        snapshot.error?.message ??
                                            'Realtime error',
                                    ),
                                );
                            }
                            if (snapshot.status === 'live' && snapshot.data) {
                                const serialized = JSON.stringify(
                                    snapshot.data,
                                );
                                if (initial === undefined) {
                                    initial = serialized;
                                } else if (initial !== serialized) {
                                    clearTimeout(timeout);
                                    resolve();
                                }
                            }
                        });
                    });
                    for (let i = 0; i < 100 && initial === undefined; i++)
                        await new Promise((resolve) =>
                            setTimeout(resolve, 100),
                        );
                    assert.notEqual(
                        initial,
                        undefined,
                        'Realtime initial snapshot missing',
                    );
                    const student = (
                        await pool.query(
                            'SELECT id,name,student_number,email,program,year_level FROM public.students WHERE neon_auth_id=$1',
                            [sessions[0].user.id],
                        )
                    ).rows[0];
                    const updated = await web.request(
                        '/students/' + student.id,
                        { ...student, program: 'Realtime integration check' },
                        'PATCH',
                    );
                    assert.equal(updated.status, 302);
                    await changed;
                    resolveChanged();
                    stop();
                    stop = undefined;
                    assert.equal(
                        (
                            await call(
                                '/api/v1/profile',
                                sessions[0],
                                { theme: 'dark' },
                                'PATCH',
                            )
                        ).status,
                        200,
                    );
                },
            );
            await t.test(
                'Concurrent bookings cannot overfill a shared period; another student cannot cancel the visit',
                async () => {
                    originalSchedule = (
                        await pool.query(
                            'SELECT * FROM public.clinic_schedules WHERE date=$1',
                            [date],
                        )
                    ).rows[0];
                    const counts = await pool.query(
                        "SELECT count(*) FILTER(WHERE t.period='morning')::int AS morning,count(*)::int AS total FROM public.appointments a JOIN public.appointment_slots t ON t.id=a.appointment_slot_id JOIN public.clinic_schedules s ON s.id=t.clinic_schedule_id WHERE s.date=$1 AND a.status<>'cancelled'",
                        [date],
                    );
                    const { morning, total } = counts.rows[0];
                    assert.ok(
                        morning < 24 && total < 48,
                        'Test date must have one spare place',
                    );
                    if (!originalSchedule) {
                        const state = (await call('/api/v1/state', sessions[0]))
                            .data;
                        assert.equal(
                            state.slots[date].dailyRemaining,
                            0,
                            'Unpublished days must be unavailable',
                        );
                        assert.equal(
                            (
                                await call('/api/v1/visits', sessions[0], {
                                    date,
                                    period: 'morning',
                                    service: 'physical_exam',
                                })
                            ).status,
                            409,
                        );
                    }
                    const scheduled = await web.request(
                        originalSchedule
                            ? '/schedules/' + originalSchedule.id
                            : '/schedules',
                        {
                            date,
                            morning_capacity: morning + 1,
                            afternoon_capacity: 24,
                            daily_capacity: total + 1,
                            is_open: true,
                        },
                        originalSchedule ? 'PATCH' : 'POST',
                    );
                    assert.equal(
                        scheduled.status,
                        302,
                        JSON.stringify(scheduled.data),
                    );
                    scheduleChanged = true;
                    const booking = {
                        date,
                        period: 'morning',
                        service: 'physical_exam',
                        notes: 'Automated prototype test',
                    };
                    const results = await Promise.all(
                        sessions.map((session) =>
                            call('/api/v1/visits', session, booking),
                        ),
                    );
                    assert.deepEqual(
                        results
                            .map((result) => result.status)
                            .sort((a, b) => a - b),
                        [201, 409],
                    );
                    const winner = results.findIndex(
                            (result) => result.status === 201,
                        ),
                        loser = 1 - winner,
                        id = results[winner].data.id;
                    assert.equal(
                        (
                            await call(
                                '/api/v1/visits/' + id + '/cancel',
                                sessions[loser],
                                {},
                            )
                        ).status,
                        404,
                    );
                    assert.equal(
                        (
                            await call('/api/v1/visits', sessions[winner], {
                                ...booking,
                                date: '2020-01-01',
                            })
                        ).status,
                        422,
                    );
                    assert.equal(
                        (
                            await call('/api/v1/visits', sessions[winner], {
                                ...booking,
                                status: 'completed',
                            })
                        ).status,
                        422,
                    );
                    assert.equal(
                        (
                            await call(
                                '/api/v1/visits/' + id + '/cancel',
                                sessions[winner],
                                {},
                            )
                        ).status,
                        200,
                    );
                    assert.equal(
                        (await call('/api/v1/visits', sessions[loser], booking))
                            .status,
                        201,
                    );
                    const first = (
                        await call('/api/v1/state', sessions[winner])
                    ).data;
                    const second = (
                        await call('/api/v1/state', sessions[loser])
                    ).data;
                    assert.equal(first.visits.length, 1);
                    assert.equal(first.visits[0].status, 'cancelled');
                    assert.equal(second.visits.length, 1);
                    assert.equal(second.visits[0].status, 'scheduled');
                },
            );
            await t.test(
                'Staff see mobile bookings, change shared records, publish student-only updates, and book into the same capacity',
                async () => {
                    const student = (
                        await pool.query(
                            'SELECT * FROM public.students WHERE neon_auth_id=$1',
                            [sessions[0].user.id],
                        )
                    ).rows[0];
                    const page = await web.request('/students/' + student.id);
                    assert.equal(page.status, 200);
                    assert.equal(page.data.props.appointments.length, 1);
                    const edited = await web.request(
                        '/students/' + student.id,
                        {
                            student_number: 'TEST-' + suffix,
                            name: 'Verified Test Student',
                            email: users[0].email,
                            program: 'Integration test',
                            year_level: 2,
                        },
                        'PATCH',
                    );
                    assert.equal(
                        edited.status,
                        302,
                        JSON.stringify(edited.data),
                    );
                    const reviewed = await web.request(
                        '/clearances/' + student.id,
                        {
                            school_year: '2026-2027',
                            status: 'cleared',
                            physical_exam: true,
                            documents_received: true,
                            xray_verified: true,
                            notes: 'Temporary integration review',
                            exam_data: {
                                height_cm: 170,
                                weight_kg: 65,
                                bp_systolic: 120,
                                bp_diastolic: 80,
                                physician_notes: 'Temporary integration note',
                            },
                        },
                        'PATCH',
                    );
                    assert.equal(
                        reviewed.status,
                        302,
                        JSON.stringify(reviewed.data),
                    );
                    const state = (await call('/api/v1/state', sessions[0]))
                        .data;
                    assert.equal(state.profile.name, 'Verified Test Student');
                    assert.equal(state.clearances[0].status, 'cleared');
                    assert.equal(
                        state.clearances[0].yearLevel,
                        2,
                        'Clinic review must capture verified academic details',
                    );
                    assert.equal(state.clearances[0].exam.height, 170);
                    assert.equal(
                        state.clearances[0].exam.temperature,
                        null,
                        'Missing measurements must not be invented',
                    );
                    assert.equal(
                        state.clearances[0].exam.physicianNotes,
                        'Temporary integration note',
                    );
                    assert.equal(
                        (await call('/api/v1/state', sessions[1])).data
                            .clearances[0].status,
                        'pending',
                    );
                    const otherVisit = (
                        await pool.query(
                            "SELECT a.id,s.neon_auth_id FROM public.appointments a JOIN public.students s ON s.id=a.student_id WHERE s.neon_auth_id=ANY($1::text[]) AND a.status='scheduled'",
                            [sessions.map((session) => session.user.id)],
                        )
                    ).rows[0];
                    const cancelled = await web.request(
                        '/appointments/' + otherVisit.id + '/status',
                        { status: 'cancelled' },
                        'PATCH',
                    );
                    assert.equal(
                        cancelled.status,
                        302,
                        JSON.stringify(cancelled.data),
                    );
                    assert.equal(
                        (
                            await call(
                                '/api/v1/state',
                                sessions.find(
                                    (session) =>
                                        session.user.id ===
                                        otherVisit.neon_auth_id,
                                )!,
                            )
                        ).data.visits[0].status,
                        'cancelled',
                    );
                    const slot = (
                        await pool.query(
                            "SELECT t.id FROM public.appointment_slots t JOIN public.clinic_schedules s ON s.id=t.clinic_schedule_id WHERE s.date=$1 AND t.period='morning'",
                            [date],
                        )
                    ).rows[0];
                    assert.equal(
                        (
                            await web.request('/appointments', {
                                student_id: student.id,
                                appointment_slot_id: slot.id,
                                service: 'dental_consultation',
                                notes: 'Temporary staff booking',
                            })
                        ).status,
                        302,
                    );
                    const changed = (await call('/api/v1/state', sessions[0]))
                        .data;
                    assert.ok(
                        changed.visits.some(
                            (visit: { service: string; status: string }) =>
                                visit.service === 'dental_consultation' &&
                                visit.status === 'scheduled',
                        ),
                    );
                    assert.equal(
                        (
                            await call('/api/v1/visits', sessions[1], {
                                date,
                                period: 'morning',
                                service: 'physical_exam',
                            })
                        ).status,
                        409,
                        'Mobile must count staff reservations',
                    );
                    for (const [audience, published] of [
                        ['students', true],
                        ['staff', true],
                        ['students', false],
                    ] as const) {
                        const title = `Integration ${suffix} ${audience} ${published}`;
                        const response = await web.request('/announcements', {
                            title,
                            body: 'Temporary integration announcement',
                            audience,
                            published,
                        });
                        assert.equal(response.status, 302);
                        announcementIds.push(
                            (
                                await pool.query(
                                    'SELECT id::text FROM public.announcements WHERE title=$1',
                                    [title],
                                )
                            ).rows[0].id,
                        );
                    }
                    const announcements = (
                        await call('/api/v1/state', sessions[0])
                    ).data.announcements;
                    assert.ok(
                        announcements.some(
                            (item: { id: string }) =>
                                item.id === announcementIds[0],
                        ),
                    );
                    for (const id of announcementIds.slice(1)) {
                        assert.ok(
                            !announcements.some(
                                (item: { id: string }) => item.id === id,
                            ),
                        );
                        assert.equal(
                            (
                                await call(
                                    `/api/v1/announcements/${id}/read`,
                                    sessions[0],
                                    {},
                                )
                            ).status,
                            404,
                        );
                    }
                },
            );
            await t.test(
                'Simultaneous web and mobile reservations share a single remaining place',
                async () => {
                    const ids = sessions.map((session) => session.user.id);
                    const active = (
                        await pool.query(
                            "SELECT a.id FROM public.appointments a JOIN public.students s ON s.id=a.student_id WHERE s.neon_auth_id=ANY($1::text[]) AND a.status='scheduled'",
                            [ids],
                        )
                    ).rows[0];
                    assert.equal(
                        (
                            await web.request(
                                `/appointments/${active.id}/status`,
                                { status: 'cancelled' },
                                'PATCH',
                            )
                        ).status,
                        302,
                    );
                    const student = (
                        await pool.query(
                            'SELECT id FROM public.students WHERE neon_auth_id=$1',
                            [ids[0]],
                        )
                    ).rows[0];
                    const slot = (
                        await pool.query(
                            "SELECT t.id FROM public.appointment_slots t JOIN public.clinic_schedules s ON s.id=t.clinic_schedule_id WHERE s.date=$1 AND t.period='morning'",
                            [date],
                        )
                    ).rows[0];
                    const [staff, mobile] = await Promise.all([
                        web.request('/appointments', {
                            student_id: student.id,
                            appointment_slot_id: slot.id,
                            service: 'physical_exam',
                        }),
                        call('/api/v1/visits', sessions[1], {
                            date,
                            period: 'morning',
                            service: 'physical_exam',
                        }),
                    ]);
                    assert.ok(
                        (staff.status === 302 && mobile.status === 409) ||
                            (staff.status === 422 && mobile.status === 201),
                        `Unexpected race results: web ${staff.status}, mobile ${mobile.status}`,
                    );
                    const count = (
                        await pool.query(
                            "SELECT count(*)::int AS total FROM public.appointments a JOIN public.students s ON s.id=a.student_id WHERE s.neon_auth_id=ANY($1::text[]) AND a.status='scheduled'",
                            [ids],
                        )
                    ).rows[0].total;
                    assert.equal(
                        count,
                        1,
                        'Both clients must never claim the last place',
                    );
                },
            );
            await t.test(
                'Announcement reads and preferences persist independently',
                async () => {
                    const state = (await call('/api/v1/state', sessions[0]))
                        .data;
                    assert.ok(state.announcements.length > 0);
                    assert.equal(
                        (
                            await call(
                                '/api/v1/announcements/' +
                                    state.announcements[0].id +
                                    '/read',
                                sessions[0],
                                {},
                            )
                        ).status,
                        200,
                    );
                    assert.equal(
                        (await call('/api/v1/state', sessions[0])).data
                            .readAnnouncements.length,
                        1,
                    );
                    assert.equal(
                        (await call('/api/v1/state', sessions[1])).data
                            .readAnnouncements.length,
                        0,
                    );
                    assert.equal(
                        (await call('/api/v1/state', sessions[0])).data.theme,
                        'dark',
                    );
                },
            );
            await t.test(
                'AI Gateway returns an answer or its real credit requirement',
                async () => {
                    const result = await call('/api/v1/guide', sessions[0], {
                        question: 'How do I book a clinic visit?',
                    });
                    if (
                        result.status === 503 &&
                        /credits/.test(result.data.error)
                    ) {
                        console.log('AI_GATEWAY_BLOCKED: ' + result.data.error);
                        return;
                    }
                    assert.equal(
                        result.status,
                        200,
                        JSON.stringify(result.data),
                    );
                    assert.ok(result.data.answer);
                    console.log('AI_GATEWAY_VERIFIED: ' + result.data.model);
                },
            );
        } finally {
            stop?.();
            client.close();
            for (const session of sessions) {
                await call('/auth/sign-out', session, {}).catch(() => {});
                await pool.query(
                    'DELETE FROM public.student_announcement_reads WHERE student_id IN (SELECT id FROM public.students WHERE neon_auth_id=$1)',
                    [session.user.id],
                );
                await pool.query(
                    'DELETE FROM public.appointments WHERE student_id IN (SELECT id FROM public.students WHERE neon_auth_id=$1)',
                    [session.user.id],
                );
                await pool.query(
                    'DELETE FROM public.clearances WHERE student_id IN (SELECT id FROM public.students WHERE neon_auth_id=$1)',
                    [session.user.id],
                );
                await pool.query(
                    'DELETE FROM public.students WHERE neon_auth_id=$1',
                    [session.user.id],
                );
                await pool.query(
                    'DELETE FROM public.student_sync WHERE id=$1',
                    [session.user.id],
                );
                const index = sessions.indexOf(session);
                await pool.query(
                    'DELETE FROM neon_auth."user" WHERE id=$1 AND email=$2',
                    [session.user.id, users[index].email],
                );
            }
            for (const id of announcementIds)
                await pool.query(
                    'DELETE FROM public.announcements WHERE id=$1',
                    [id],
                );
            if (scheduleChanged && originalSchedule) {
                await pool.query(
                    'UPDATE public.clinic_schedules SET morning_capacity=$2,afternoon_capacity=$3,daily_capacity=$4,is_open=$5 WHERE date=$1',
                    [
                        date,
                        originalSchedule.morning_capacity,
                        originalSchedule.afternoon_capacity,
                        originalSchedule.daily_capacity,
                        originalSchedule.is_open,
                    ],
                );
                await pool.query(
                    "UPDATE public.appointment_slots SET capacity=CASE WHEN period='morning' THEN $2::int ELSE $3::int END WHERE clinic_schedule_id=$1 AND period IS NOT NULL",
                    [
                        originalSchedule.id,
                        originalSchedule.morning_capacity,
                        originalSchedule.afternoon_capacity,
                    ],
                );
            } else if (scheduleChanged)
                await pool.query(
                    'DELETE FROM public.clinic_schedules WHERE date=$1',
                    [date],
                );
            await web.request('/logout', {}).catch(() => {});
            await pool.end();
        }
    },
);
