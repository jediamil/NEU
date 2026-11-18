export type ClearanceRecord = {
    id?: number;
    status: string;
    physical_exam?: boolean;
    documents_received?: boolean;
    xray_verified?: boolean;
    notes?: string | null;
    reviewed_at?: string | null;
};
export type Student = {
    id: number;
    student_number: string;
    name: string;
    email?: string | null;
    program: string;
    year_level: number;
    clearance?: ClearanceRecord | null;
};
export type Appointment = {
    id: number;
    reference: string;
    service: string;
    service_label: string;
    status: string;
    notes: string | null;
    student: Student;
    slot_id: number;
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
};
export type Announcement = {
    id: number;
    title: string;
    body: string;
    audience: string;
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
    opening_time: string;
    closing_time: string;
    slot_minutes: number;
    slot_capacity: number;
    daily_capacity: number;
    booked: number;
    slots: { id: number; label: string; capacity: number; reserved: number }[];
};
