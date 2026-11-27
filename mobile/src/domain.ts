export type Period = 'morning' | 'afternoon';
export type Service =
    | 'physical_exam'
    | 'xray_verification'
    | 'dental_consultation'
    | 'tooth_extraction'
    | 'medical_clearance_submission';
export type VisitStatus =
    | 'scheduled'
    | 'checked_in'
    | 'completed'
    | 'cancelled'
    | 'no_show';
export type Tab = 'home' | 'visits' | 'records' | 'updates' | 'profile';
export type Profile = {
    name: string;
    studentNumber: string;
    program: string;
    college?: string | null;
    yearLevel: number;
    email: string;
    phone: string;
};
export type Visit = {
    id: string;
    reference: string;
    date: string;
    period: Period;
    service: Service | 'document_submission';
    services?: (Service | 'document_submission')[] | null;
    timeRange?: string;
    status: VisitStatus;
    notes: string;
};
export type Clearance = {
    id: string;
    schoolYear: string;
    status: 'pending' | 'incomplete' | 'cleared';
    yearLevel: number;
    physicalExam: boolean;
    documentsReceived: boolean;
    xrayVerified: boolean;
    reviewedAt: string | null;
    notes: string;
    exam: {
        height: number | null;
        weight: number | null;
        bp: string;
        temperature: number | null;
        leftEye: string;
        rightEye: string;
        physicianNotes: string;
    } | null;
};
export type PrototypeState = {
    version: 1;
    started: boolean;
    profile: Profile;
    visits: Visit[];
    clearances: Clearance[];
    readAnnouncements: string[];
    theme: 'system' | 'light' | 'dark';
    connected?: boolean;
    announcements?: typeof ANNOUNCEMENTS;
    slots?: Record<
        string,
        {
            morning: number;
            afternoon: number;
            reserved: Record<Period, number>;
            dailyRemaining: number;
            bookingCutoff?: string;
        }
    >;
};
export const ACTIVE_SCHOOL_YEAR = '2026-2027';
export const SERVICES: Record<
    Service,
    {
        label: string;
        short: string;
        icon:
            | 'body-outline'
            | 'scan-outline'
            | 'happy-outline'
            | 'sparkles-outline';
        description: string;
    }
> = {
    medical_clearance_submission: {
        label: 'Medical clearance submission',
        short: 'Clearance submission',
        icon: 'scan-outline',
        description: 'Bring your medical clearance requirements to the clinic.',
    },
    physical_exam: {
        label: 'Physical examination',
        short: 'Physical exam',
        icon: 'body-outline',
        description:
            'Your physical assessment and school-year health clearance.',
    },
    xray_verification: {
        label: 'X-ray verification',
        short: 'X-ray',
        icon: 'scan-outline',
        description: 'Review your X-ray requirement for school-year clearance.',
    },
    dental_consultation: {
        label: 'Dental consultation',
        short: 'Dental visit',
        icon: 'happy-outline',
        description: 'Arrange a visit with the university dental clinic.',
    },
    tooth_extraction: {
        label: 'Tooth extraction',
        short: 'Extraction',
        icon: 'sparkles-outline',
        description: 'Schedule a dental appointment for clinic assessment.',
    },
};
export function bookingServices(value: unknown): Service[] | null {
    if (
        !Array.isArray(value) ||
        !value.length ||
        value.some(
            (service) =>
                typeof service !== 'string' ||
                !Object.hasOwn(SERVICES, service),
        ) ||
        new Set(value).size !== value.length
    ) {
        return null;
    }

    return value as Service[];
}

export const PERIODS: Record<
    Period,
    { label: string; time: string; startHour: number; endHour: number }
> = {
    morning: {
        label: 'Morning',
        time: '8:00 AM–12:00 PM',
        startHour: 8,
        endHour: 12,
    },
    afternoon: {
        label: 'Afternoon',
        time: '1:00–4:00 PM',
        startHour: 13,
        endHour: 16,
    },
};
export const ANNOUNCEMENTS = [
    {
        id: 'clearance',
        category: 'CLEARANCE',
        title: 'A little preparation goes a long way.',
        summary: 'Keep your school-year health clearance on track.',
        body: 'Check your clearance checklist before your clinic visit. Bring the documents requested by the clinic, and keep your appointment reference ready. Your record will show Pending, Incomplete, or Cleared as clinic staff review your requirements.',
        icon: 'shield-checkmark-outline' as const,
        color: 'green',
    },
    {
        id: 'clinic-hours',
        category: 'CLINIC ADVISORY',
        title: 'Two periods. One easier clinic day.',
        summary: 'Morning and Afternoon appointments are now available.',
        body: 'Choose Morning (8:00 AM–12:00 PM) or Afternoon (1:00–4:00 PM). The midday break is 12:00–1:00 PM. Capacity is shared across appointment services. In this prototype, availability and reservations are demonstration data saved only on your device.',
        icon: 'time-outline' as const,
        color: 'blue',
    },
    {
        id: 'health-programs',
        category: 'CAMPUS WELLNESS',
        title: 'Care beyond your appointment.',
        summary: 'Discover the clinic’s health programs and activities.',
        body: 'Clinic announcements are the place to find immunization drives, health seminars, annual physical-examination advisories, and community health activities. This sample announcement demonstrates how future clinic updates will appear; it does not announce a real scheduled event.',
        icon: 'leaf-outline' as const,
        color: 'amber',
    },
];

export function campusDate(now = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now);
    const part = (type: string) =>
        parts.find((value) => value.type === type)?.value;
    return part('year') + '-' + part('month') + '-' + part('day');
}
export function shiftDate(date: string, offset: number): string {
    const value = new Date(date + 'T12:00:00+08:00');
    value.setUTCDate(value.getUTCDate() + offset);
    return campusDate(value);
}
export function dateLabel(
    date: string,
    options?: Intl.DateTimeFormatOptions,
): string {
    return new Intl.DateTimeFormat(
        'en-PH',
        options ?? { month: 'short', day: 'numeric', year: 'numeric' },
    ).format(new Date(date + 'T12:00:00'));
}
export function bookingDates(
    now = new Date(),
    includeWeekends = true,
): string[] {
    const today = campusDate(now);
    return Array.from({ length: 29 }, (_, index) =>
        shiftDate(today, index),
    ).filter(
        (date) =>
            includeWeekends ||
            ![0, 6].includes(new Date(date + 'T12:00:00').getDay()),
    );
}
export function periodStarts(date: string, period: Period): Date {
    return periodBoundary(date, PERIODS[period].startHour);
}
export function periodEnds(date: string, period: Period): Date {
    return periodBoundary(date, PERIODS[period].endHour);
}
export function bookingClosesAt(
    date: string,
    period: Period,
    cutoff?: string,
): number {
    const periodEnd = periodEnds(date, period).getTime();
    return cutoff
        ? Math.min(
              periodEnd,
              Date.parse(date + 'T' + cutoff.slice(0, 5) + ':00+08:00'),
          )
        : periodEnd;
}
function periodBoundary(date: string, hour: number): Date {
    return new Date(
        date + 'T' + String(hour).padStart(2, '0') + ':00:00+08:00',
    );
}
export function demoReservations(date: string): Record<Period, number> {
    const seed = Number(date.replaceAll('-', ''));
    return {
        morning: seed % 6 === 0 ? 24 : 7 + (seed % 11),
        afternoon: seed % 9 === 0 ? 24 : 5 + (seed % 12),
    };
}
export function availability(
    state: PrototypeState,
    date: string,
    now = new Date(),
) {
    if (state.connected) {
        const live = state.slots?.[date] ?? {
            morning: 0,
            afternoon: 0,
            reserved: { morning: 0, afternoon: 0 },
            dailyRemaining: 0,
        };
        const cutoff = state.slots?.[date]?.bookingCutoff;
        return {
            ...live,
            morning:
                bookingClosesAt(date, 'morning', cutoff) > now.getTime()
                    ? live.morning
                    : 0,
            afternoon:
                bookingClosesAt(date, 'afternoon', cutoff) > now.getTime()
                    ? live.afternoon
                    : 0,
        };
    }
    const base = demoReservations(date);
    const occupied = state.visits.filter(
        (visit) => visit.date === date && visit.status !== 'cancelled',
    );
    const reserved = {
        morning:
            base.morning +
            occupied.filter((visit) => visit.period === 'morning').length,
        afternoon:
            base.afternoon +
            occupied.filter((visit) => visit.period === 'afternoon').length,
    };
    const dailyRemaining = Math.max(
        0,
        48 - reserved.morning - reserved.afternoon,
    );
    const validDate = bookingDates(now, false).includes(date);
    const remaining = (period: Period) =>
        validDate && periodEnds(date, period).getTime() > now.getTime()
            ? Math.max(0, Math.min(24 - reserved[period], dailyRemaining))
            : 0;
    return {
        morning: remaining('morning'),
        afternoon: remaining('afternoon'),
        reserved,
        dailyRemaining,
    };
}
export function createInitialState(now = new Date()): PrototypeState {
    const upcoming = bookingDates(
        new Date(now.getTime() + 24 * 60 * 60 * 1000),
        false,
    ).find((date) => demoReservations(date).morning < 24)!;
    return {
        version: 1,
        started: false,
        theme: 'system',
        readAnnouncements: [],
        profile: {
            name: 'Alex Rivera',
            studentNumber: '2026-10482',
            program: 'BS Information Systems',
            yearLevel: 2,
            email: 'alex.rivera@example.test',
            phone: '',
        },
        visits: [
            {
                id: 'demo-upcoming',
                reference: 'NEU-DEMO-10482',
                date: upcoming,
                period: 'morning',
                service: 'physical_exam',
                status: 'scheduled',
                notes: 'Bring the documents listed in your clinic requirements.',
            },
            {
                id: 'demo-history',
                reference: 'NEU-DEMO-09231',
                date: shiftDate(campusDate(now), -40),
                period: 'afternoon',
                service: 'dental_consultation',
                status: 'completed',
                notes: '',
            },
        ],
        clearances: [
            {
                id: 'current',
                schoolYear: ACTIVE_SCHOOL_YEAR,
                status: 'incomplete',
                yearLevel: 2,
                physicalExam: false,
                documentsReceived: true,
                xrayVerified: false,
                reviewedAt: null,
                notes: 'Please complete your physical examination and X-ray requirement.',
                exam: null,
            },
            {
                id: 'previous',
                schoolYear: '2025-2026',
                status: 'cleared',
                yearLevel: 1,
                physicalExam: true,
                documentsReceived: true,
                xrayVerified: true,
                reviewedAt: '2025-08-19',
                notes: 'All school-year requirements were verified.',
                exam: {
                    height: 168,
                    weight: 60,
                    bp: '118 / 78',
                    temperature: 36.6,
                    leftEye: '20/20',
                    rightEye: '20/20',
                    physicianNotes:
                        'Demonstration examination record. These are fictional results.',
                },
            },
        ],
    };
}
export function restoreState(raw: string): PrototypeState {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object')
        throw new Error('The saved prototype data could not be read.');
    const state = value as Partial<PrototypeState>;
    if (
        state.version !== 1 ||
        typeof state.started !== 'boolean' ||
        !state.profile ||
        !Array.isArray(state.visits) ||
        !Array.isArray(state.clearances) ||
        !Array.isArray(state.readAnnouncements) ||
        !['system', 'light', 'dark'].includes(state.theme ?? '')
    )
        throw new Error('The saved prototype data is not compatible.');
    if (
        typeof state.profile.name !== 'string' ||
        typeof state.profile.studentNumber !== 'string' ||
        typeof state.profile.email !== 'string' ||
        !Number.isInteger(state.profile.yearLevel)
    )
        throw new Error('The saved student profile could not be read.');
    if (
        typeof state.profile.program !== 'string' ||
        typeof state.profile.phone !== 'string' ||
        state.readAnnouncements.some((id) => typeof id !== 'string')
    )
        throw new Error('The saved student profile could not be read.');
    if (
        state.visits.some(
            (visit) =>
                !visit ||
                typeof visit.id !== 'string' ||
                typeof visit.date !== 'string' ||
                !(visit.period in PERIODS) ||
                !(visit.service in SERVICES) ||
                ![
                    'scheduled',
                    'checked_in',
                    'completed',
                    'cancelled',
                    'no_show',
                ].includes(visit.status),
        )
    )
        throw new Error('The saved appointments could not be read.');
    if (
        state.visits.some(
            (visit) =>
                typeof visit.reference !== 'string' ||
                typeof visit.notes !== 'string',
        ) ||
        state.clearances.some(
            (record) =>
                !record ||
                typeof record.id !== 'string' ||
                typeof record.schoolYear !== 'string' ||
                !['pending', 'incomplete', 'cleared'].includes(record.status) ||
                !Number.isInteger(record.yearLevel) ||
                typeof record.notes !== 'string' ||
                typeof record.physicalExam !== 'boolean' ||
                typeof record.documentsReceived !== 'boolean' ||
                typeof record.xrayVerified !== 'boolean' ||
                (record.exam !== null &&
                    (typeof record.exam !== 'object' ||
                        typeof record.exam?.height !== 'number' ||
                        typeof record.exam?.weight !== 'number')),
        )
    )
        throw new Error('The saved medical records could not be read.');
    return state as PrototypeState;
}
export function bookVisit(
    state: PrototypeState,
    input: {
        date: string;
        period: Period;
        service?: Service;
        services?: Service[];
        notes: string;
    },
    now = new Date(),
    id = String(Date.now()),
): PrototypeState {
    const services = bookingServices(input.services ?? [input.service]);
    if (!services || !Object.hasOwn(PERIODS, input.period))
        throw new Error(
            'Choose an available clinic service and booking period.',
        );
    if (!bookingDates(now, state.connected === true).includes(input.date))
        throw new Error(
            'Choose an open clinic date within the next four weeks.',
        );
    if (
        bookingClosesAt(
            input.date,
            input.period,
            state.slots?.[input.date]?.bookingCutoff,
        ) <= now.getTime()
    )
        throw new Error(
            'Booking has ended for this period. Please choose another.',
        );
    if (
        state.visits.some(
            (visit) =>
                visit.date === input.date && visit.status !== 'cancelled',
        )
    )
        throw new Error(
            'You already have an appointment on this date. Cancel it before booking a different period.',
        );
    if (availability(state, input.date, now)[input.period] <= 0)
        throw new Error('This booking period is full. Please choose another.');
    if (input.notes.length > 1000)
        throw new Error('Keep appointment notes within 1,000 characters.');
    const visit: Visit = {
        date: input.date,
        period: input.period,
        service: services[0],
        services,
        notes: input.notes.trim(),
        id,
        reference:
            'NEU-P-' +
            input.date.replaceAll('-', '').slice(2) +
            '-' +
            id.slice(-5).toUpperCase(),
        status: 'scheduled',
    };
    return { ...state, visits: [visit, ...state.visits] };
}
export function cancelVisit(
    state: PrototypeState,
    id: string,
    now = new Date(),
): PrototypeState {
    const visit = state.visits.find((item) => item.id === id);
    if (!visit || visit.status !== 'scheduled')
        throw new Error('Only scheduled appointments can be cancelled.');
    if (periodStarts(visit.date, visit.period).getTime() <= now.getTime())
        throw new Error(
            'This period has started. Contact the clinic about this visit.',
        );
    return {
        ...state,
        visits: state.visits.map((item) =>
            item.id === id ? { ...item, status: 'cancelled' } : item,
        ),
    };
}
export function updateContact(
    state: PrototypeState,
    input: { name: string; email: string; phone: string },
): PrototypeState {
    if (input.name.trim().length < 2 || input.name.trim().length > 100)
        throw new Error('Enter a name between 2 and 100 characters.');
    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()) ||
        input.email.length > 150
    )
        throw new Error('Enter a valid email address.');
    if (input.phone.length > 30)
        throw new Error('Keep the contact number within 30 characters.');
    return {
        ...state,
        profile: {
            ...state.profile,
            name: input.name.trim(),
            email: input.email.trim(),
            phone: input.phone.trim(),
        },
    };
}
export function guideAnswer(question: string): string {
    if (/cancel|reschedul/i.test(question))
        return 'Open My visits and select your scheduled appointment. You can cancel before the period starts, then book another available period. Prototype changes are saved only on this device.';
    if (/book|appointment|schedul|time|slot/i.test(question))
        return 'Tap Book a visit, choose a service and an open calendar date, then select Morning (8 AM–12 PM) or Afternoon (1–4 PM). Booking closes at the cutoff set by the clinic or when the period ends, whichever comes first. Bring your reference when you visit the clinic.';
    if (/clearance|record|history|exam|x.?ray/i.test(question))
        return 'Open Records to see each school-year clearance and its checklist. Tap an earlier year to view that year’s examination record. Clinic staff review requirements and update clearance; booking an appointment does not automatically clear you.';
    if (/document|bring|requirement/i.test(question))
        return 'Check your clearance checklist and the clinic announcements for required documents. In the connected app, clinic staff will publish the current requirements.';
    if (/neon|offline|prototype|sync|demo/i.test(question))
        return 'This is an offline prototype. It uses fictional student records and saves changes on this iPhone. It is not yet connected to the clinic portal.';
    return 'I can explain booking, cancellation, clearance records, and how this prototype works. For health questions or clinic-specific requirements, speak with the university clinic.';
}
