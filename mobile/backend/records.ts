import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { pool } from './db.ts';
import {
    bookingDates,
    periodStarts,
    PERIODS,
    SERVICES,
    ACTIVE_SCHOOL_YEAR,
} from '../src/domain.ts';
import type { Period, Service } from '../src/domain.ts';

type Identity = { id: string; name: string; email: string };
type Variables = { user: Identity; studentId: string };
export const records = new Hono<{ Variables: Variables }>();
const fail = (status: 400 | 404 | 409 | 422, message: string): never => {
    throw new HTTPException(status, { message });
};
function text(value: unknown, label: string, max: number, min = 0): string {
    if (
        typeof value !== 'string' ||
        value.trim().length < min ||
        value.length > max
    )
        return fail(422, `Enter a valid ${label}.`);
    return value.trim();
}
async function body(request: Request): Promise<Record<string, unknown>> {
    try {
        const value: unknown = await request.json();
        if (!value || Array.isArray(value) || typeof value !== 'object')
            return fail(400, 'Enter valid request data.');
        return value as Record<string, unknown>;
    } catch {
        return fail(400, 'Enter valid request data.');
    }
}

records.use('*', async (c, next) => {
    const user = c.get('user');
    // Only an exact managed identity is linked. An unverified email must never claim an existing clinic record.
    const student = await pool.query(
        `INSERT INTO public.students(neon_auth_id,student_number,name,email,program,year_level,created_at,updated_at)
         VALUES($1,$2,$3,$4,'Awaiting clinic verification',1,(now() AT TIME ZONE 'Asia/Manila'),(now() AT TIME ZONE 'Asia/Manila'))
         ON CONFLICT(neon_auth_id) DO NOTHING RETURNING id`,
        [
            user.id,
            'PENDING-' + user.id.replaceAll('-', '').slice(0, 20),
            user.name,
            user.email,
        ],
    );
    const id = (
        student.rows[0] ??
        (
            await pool.query(
                'SELECT id FROM public.students WHERE neon_auth_id=$1',
                [user.id],
            )
        ).rows[0]
    ).id as string;
    await pool.query(
        `INSERT INTO public.clearances(student_id,school_year,status,student_snapshot,created_at,updated_at)
         SELECT id,$2,'pending',NULL,(now() AT TIME ZONE 'Asia/Manila'),(now() AT TIME ZONE 'Asia/Manila')
         FROM public.students WHERE id=$1 ON CONFLICT(student_id,school_year) DO NOTHING`,
        [id, process.env.CLINIC_ACTIVE_SCHOOL_YEAR ?? ACTIVE_SCHOOL_YEAR],
    );
    c.set('studentId', id);
    await next();
});

records.get('/state', async (c) => {
    const id = c.get('studentId');
    const dates = bookingDates();
    const [
        students,
        visits,
        clearances,
        reads,
        announcements,
        counts,
        schedules,
    ] = await Promise.all([
        pool.query(
            'SELECT name,student_number AS "studentNumber",program,year_level AS "yearLevel",email,phone,theme FROM public.students WHERE id=$1',
            [id],
        ),
        pool.query(
            `SELECT a.mobile_id::text AS id,a.reference,s.date::text,
            COALESCE(t.period,CASE WHEN t.starts_at::time < '12:00'::time THEN 'morning' ELSE 'afternoon' END) AS period,
            a.service,a.status,COALESCE(a.notes,'') AS notes
            FROM public.appointments a JOIN public.appointment_slots t ON t.id=a.appointment_slot_id
            JOIN public.clinic_schedules s ON s.id=t.clinic_schedule_id WHERE a.student_id=$1 ORDER BY a.created_at DESC LIMIT 200`,
            [id],
        ),
        pool.query(
            `SELECT id::text,school_year AS "schoolYear",COALESCE((student_snapshot->>'year_level')::int,(SELECT year_level FROM public.students WHERE id=$1)) AS "yearLevel",
            status,physical_exam AS "physicalExam",documents_received AS "documentsReceived",xray_verified AS "xrayVerified",
            reviewed_at::date::text AS "reviewedAt",COALESCE(notes,'') AS notes,exam_data AS exam
            FROM public.clearances WHERE student_id=$1 ORDER BY school_year DESC`,
            [id],
        ),
        pool.query(
            'SELECT announcement_id::text FROM public.student_announcement_reads WHERE student_id=$1',
            [id],
        ),
        pool.query(`SELECT id::text,'CLINIC UPDATE' AS category,title,left(body,140) AS summary,body,
            'megaphone-outline' AS icon,'green' AS color FROM public.announcements
            WHERE audience IN ('students','everyone') AND published_at<=(now() AT TIME ZONE 'Asia/Manila') ORDER BY published_at DESC LIMIT 100`),
        pool.query(
            `SELECT s.date::text,COALESCE(t.period,CASE WHEN t.starts_at::time < '12:00'::time THEN 'morning' ELSE 'afternoon' END) AS period,count(*)::int AS count
            FROM public.appointments a JOIN public.appointment_slots t ON t.id=a.appointment_slot_id JOIN public.clinic_schedules s ON s.id=t.clinic_schedule_id
            WHERE s.date BETWEEN $1 AND $2 AND a.status<>'cancelled' GROUP BY s.date,2`,
            [dates[0], dates.at(-1)],
        ),
        pool.query(
            `SELECT s.id,s.date::text,s.morning_capacity AS morning,s.afternoon_capacity AS afternoon,s.daily_capacity AS daily,s.is_open,
            t.period,t.capacity,t.starts_at::text,t.ends_at::text FROM public.clinic_schedules s
            LEFT JOIN public.appointment_slots t ON t.clinic_schedule_id=s.id AND t.period IS NOT NULL WHERE s.date BETWEEN $1 AND $2`,
            [dates[0], dates.at(-1)],
        ),
    ]);
    const slots = Object.fromEntries(
        dates.map((date) => {
            const day = schedules.rows.filter((row) => row.date === date);
            const schedule = day[0];
            const reserved = { morning: 0, afternoon: 0 };
            for (const row of counts.rows)
                if (row.date === date)
                    reserved[row.period as Period] = row.count;
            const dailyRemaining = schedule?.is_open
                ? Math.max(
                      0,
                      schedule.daily - reserved.morning - reserved.afternoon,
                  )
                : 0;
            const remaining = (period: Period) => {
                const slot = day.find((row) => row.period === period);
                if (!slot || periodStarts(date, period).getTime() <= Date.now())
                    return 0;
                return Math.max(
                    0,
                    Math.min(
                        schedule[period] - reserved[period],
                        slot.capacity - reserved[period],
                        dailyRemaining,
                    ),
                );
            };
            return [
                date,
                {
                    morning: remaining('morning'),
                    afternoon: remaining('afternoon'),
                    reserved,
                    dailyRemaining,
                },
            ];
        }),
    );
    const { theme, ...profile } = students.rows[0];
    const medicalRecords = clearances.rows.map((record) => {
        const exam = record.exam;
        return {
            ...record,
            exam: exam
                ? {
                      height: exam.height_cm ?? null,
                      weight: exam.weight_kg ?? null,
                      bp:
                          exam.bp_systolic && exam.bp_diastolic
                              ? `${exam.bp_systolic}/${exam.bp_diastolic}`
                              : '',
                      temperature: exam.temperature_c ?? null,
                      leftEye: exam.eye_left ?? '',
                      rightEye: exam.eye_right ?? '',
                      physicianNotes: exam.physician_notes ?? '',
                  }
                : null,
        };
    });
    return c.json({
        version: 1,
        started: true,
        connected: true,
        profile,
        theme,
        visits: visits.rows,
        clearances: medicalRecords,
        announcements: announcements.rows,
        readAnnouncements: reads.rows.map((row) => row.announcement_id),
        slots,
    });
});

records.post('/visits', async (c) => {
    const data = await body(c.req.raw);
    if (
        Object.keys(data).some(
            (key) => !['date', 'period', 'service', 'notes'].includes(key),
        )
    )
        fail(422, 'Only reservation details can be submitted.');
    const date = text(data.date, 'clinic date', 10, 10);
    const period = text(data.period, 'booking period', 12) as Period;
    const service = text(data.service, 'service', 30) as Service;
    const notes = text(data.notes ?? '', 'appointment notes', 1000);
    if (
        !Object.hasOwn(PERIODS, period) ||
        !Object.hasOwn(SERVICES, service) ||
        !bookingDates().includes(date) ||
        periodStarts(date, period).getTime() <= Date.now()
    )
        fail(422, 'Choose an open clinic date and period within four weeks.');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Both Laravel and mobile lock the same clinic-day row before its slots.
        const schedule = (
            await client.query(
                'SELECT * FROM public.clinic_schedules WHERE date=$1 FOR UPDATE',
                [date],
            )
        ).rows[0];
        if (!schedule?.is_open)
            fail(409, 'The clinic has not opened this date for appointments.');
        const slot = (
            await client.query(
                'SELECT * FROM public.appointment_slots WHERE clinic_schedule_id=$1 AND period=$2 FOR UPDATE',
                [schedule.id, period],
            )
        ).rows[0];
        if (!slot) fail(409, 'This booking period is unavailable.');
        const reservations = await client.query(
            `SELECT a.student_id,a.appointment_slot_id,
            COALESCE(t.period,CASE WHEN t.starts_at::time < '12:00'::time THEN 'morning' ELSE 'afternoon' END) AS period
            FROM public.appointments a JOIN public.appointment_slots t ON t.id=a.appointment_slot_id
            WHERE t.clinic_schedule_id=$1 AND a.status<>'cancelled'`,
            [schedule.id],
        );
        const periodRows = reservations.rows.filter(
            (row) => row.period === period,
        );
        if (
            reservations.rows.length >= schedule.daily_capacity ||
            periodRows.length >= schedule[period + '_capacity'] ||
            reservations.rows.filter(
                (row) => row.appointment_slot_id === slot.id,
            ).length >= slot.capacity
        )
            fail(409, 'This booking period is full. Please choose another.');
        if (periodRows.some((row) => row.student_id === c.get('studentId')))
            fail(409, 'You already have an appointment in this period.');
        const id = randomUUID();
        const reference = 'NEU-' + id.slice(0, 8).toUpperCase();
        await client.query(
            `INSERT INTO public.appointments(mobile_id,student_id,appointment_slot_id,reference,service,status,notes,created_at,updated_at)
            VALUES($1,$2,$3,$4,$5,'scheduled',$6,(now() AT TIME ZONE 'Asia/Manila'),(now() AT TIME ZONE 'Asia/Manila'))`,
            [id, c.get('studentId'), slot.id, reference, service, notes],
        );
        await client.query('COMMIT');
        return c.json({ id, reference }, 201);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
});

records.post('/visits/:id/cancel', async (c) => {
    const id = c.req.param('id');
    if (!/^[0-9a-f-]{36}$/i.test(id)) fail(404, 'Visit not found.');
    const result = await pool.query(
        `UPDATE public.appointments a SET status='cancelled',updated_at=(now() AT TIME ZONE 'Asia/Manila')
        FROM public.appointment_slots t WHERE a.appointment_slot_id=t.id AND a.mobile_id=$1 AND a.student_id=$2 AND a.status='scheduled'
        AND t.starts_at > (now() AT TIME ZONE 'Asia/Manila') RETURNING a.id`,
        [id, c.get('studentId')],
    );
    if (!result.rowCount) {
        const exists = await pool.query(
            'SELECT id FROM public.appointments WHERE mobile_id=$1 AND student_id=$2',
            [id, c.get('studentId')],
        );
        if (!exists.rowCount) fail(404, 'Visit not found.');
        fail(409, 'Only a future scheduled visit can be cancelled.');
    }
    return c.json({ ok: true });
});

records.patch('/profile', async (c) => {
    const data = await body(c.req.raw);
    if (Object.keys(data).some((key) => !['phone', 'theme'].includes(key)))
        fail(
            422,
            'Identity and clinical records can only be updated by clinic staff.',
        );
    const current = (
        await pool.query(
            'SELECT phone,theme FROM public.students WHERE id=$1',
            [c.get('studentId')],
        )
    ).rows[0];
    const phone =
        data.phone === undefined
            ? current.phone
            : text(data.phone, 'contact number', 25);
    if (phone && !/^[+\d()\s-]{7,25}$/.test(phone))
        fail(422, 'Enter a valid contact number.');
    const theme = data.theme ?? current.theme;
    if (!['system', 'light', 'dark'].includes(theme as string))
        fail(422, 'Choose a valid appearance.');
    await pool.query(
        "UPDATE public.students SET phone=$2,theme=$3,updated_at=(now() AT TIME ZONE 'Asia/Manila') WHERE id=$1",
        [c.get('studentId'), phone, theme],
    );
    return c.json({ ok: true });
});
records.post('/announcements/:id/read', async (c) => {
    const id = c.req.param('id');
    if (!/^\d{1,18}$/.test(id)) fail(404, 'Announcement not found.');
    const result = await pool.query(
        `INSERT INTO public.student_announcement_reads(student_id,announcement_id)
        SELECT $1,id FROM public.announcements WHERE id=$2 AND audience IN ('students','everyone') AND published_at<=(now() AT TIME ZONE 'Asia/Manila')
        ON CONFLICT(student_id,announcement_id) DO NOTHING RETURNING id`,
        [c.get('studentId'), id],
    );
    if (!result.rowCount) {
        const exists = await pool.query(
            "SELECT id FROM public.announcements WHERE id=$1 AND audience IN ('students','everyone') AND published_at<=(now() AT TIME ZONE 'Asia/Manila')",
            [id],
        );
        if (!exists.rowCount) fail(404, 'Announcement not found.');
    }
    return c.json({ ok: true });
});
