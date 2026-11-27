export type ClearanceRecord = {
    id?: number;
    school_year: string;
    student_snapshot?: Pick<
        Student,
        'name' | 'student_number' | 'program' | 'year_level'
    > | null;
    exam_data?: ExamData | null;
    reviewer?: { id: number; name: string } | null;
    status: string;
    physical_exam?: boolean;
    documents_received?: boolean;
    xray_verified?: boolean;
    notes?: string | null;
    reviewed_at?: string | null;
};
export type BookingPeriod = 'morning' | 'afternoon';
export type ExamData = {
    height_cm?: number | string | null;
    weight_kg?: number | string | null;
    bp_systolic?: number | string | null;
    bp_diastolic?: number | string | null;
    temperature_c?: number | string | null;
    eye_left?: string | null;
    eye_right?: string | null;
    last_menstrual_period?: string | null;
    has_cough?: boolean | null;
    has_colds?: boolean | null;
    has_allergies?: boolean | null;
    allergy_details?: string | null;
    physician_notes?: string | null;
};
export type Student = {
    id: number;
    student_number: string;
    name: string;
    email?: string | null;
    program: string;
    college?: string | null;
    year_level: number;
    age?: number | null;
    section?: string | null;
    clearance?: ClearanceRecord | null;
};
export type Appointment = {
    id: number;
    reference: string;
    service: string;
    services: string[];
    service_label: string;
    status: string;
    notes: string | null;
    student: Student;
    slot_id: number;
    period: BookingPeriod;
    legacy_time: boolean;
    starts_at: string;
    ends_at: string;
};
export type AppointmentSlot = {
    id: number;
    date: string;
    label: string;
    capacity: number;
    reserved: number;
    remaining: number;
    period_remaining?: number;
    daily_remaining?: number;
    period: BookingPeriod | null;
};
export type Announcement = {
    id: number;
    title: string;
    body: string;
    audience: string;
    image_url?: string | null;
    published_at: string | null;
    created_at?: string;
};
export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
    prev_page_url: string | null;
    next_page_url: string | null;
};
export type ClinicDay = {
    id: number | null;
    date: string;
    day: string;
    number: string;
    is_today: boolean;
    is_past: boolean;
    is_open: boolean;
    morning_capacity: number;
    afternoon_capacity: number;
    daily_capacity: number;
    booked: number;
    booking_cutoff: string;
    slots: {
        id: number;
        label: string;
        capacity: number;
        reserved: number;
        booking_closes_at: string;
    }[];
};
