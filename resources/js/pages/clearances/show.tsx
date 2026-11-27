import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    HeartPulse,
    LoaderCircle,
    Pencil,
    Save,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ClearanceHistory } from '@/components/clearance-history';
import {
    dateLabel,
    Field,
    PageHeading,
    SectionHeading,
    StatusBadge,
} from '@/components/clinic-ui';
import { StudentDialog } from '@/components/student-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { index, show, update } from '@/routes/clearances';
import type { ClearanceRecord, Student } from '@/types/clinic';

type Props = {
    student: Student;
    record: ClearanceRecord | null;
    school_year: string;
    history: ClearanceRecord[];
};
function answer(value?: boolean | null) {
    return value == null ? '' : value ? 'yes' : 'no';
}
function nullableAnswer(value: string) {
    return value === '' ? null : value === 'yes';
}

function ClearanceEditor({ student, record, school_year, history }: Props) {
    const [editing, setEditing] = useState(false);
    const [targetYear, setTargetYear] = useState(school_year);
    const exam = record?.exam_data;
    const form = useForm({
        school_year,
        status: record?.status ?? 'pending',
        physical_exam: record?.physical_exam ?? false,
        documents_received: record?.documents_received ?? false,
        xray_verified: record?.xray_verified ?? false,
        notes: record?.notes ?? '',
        exam_data: {
            height_cm: String(exam?.height_cm ?? ''),
            weight_kg: String(exam?.weight_kg ?? ''),
            bp_systolic: String(exam?.bp_systolic ?? ''),
            bp_diastolic: String(exam?.bp_diastolic ?? ''),
            temperature_c: String(exam?.temperature_c ?? ''),
            eye_left: exam?.eye_left ?? '',
            eye_right: exam?.eye_right ?? '',
            last_menstrual_period: exam?.last_menstrual_period ?? '',
            has_cough: answer(exam?.has_cough),
            has_colds: answer(exam?.has_colds),
            has_allergies: answer(exam?.has_allergies),
            allergy_details: exam?.allergy_details ?? '',
            physician_notes: exam?.physician_notes ?? '',
        },
    });
    const errors = form.errors as Record<string, string | undefined>;
    const pageErrors = usePage().props.errors;
    useEffect(
        () =>
            router.on('before', (event) => {
                if (
                    event.detail.visit.method === 'get' &&
                    form.isDirty &&
                    !window.confirm(
                        'Leave this record and discard unsaved changes?',
                    )
                )
                    event.preventDefault();
            }),
        [form.isDirty],
    );
    function setExam(key: keyof typeof form.data.exam_data, value: string) {
        form.setData('exam_data', { ...form.data.exam_data, [key]: value });
    }
    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            exam_data: {
                ...data.exam_data,
                has_cough: nullableAnswer(data.exam_data.has_cough),
                has_colds: nullableAnswer(data.exam_data.has_colds),
                has_allergies: nullableAnswer(data.exam_data.has_allergies),
            },
        }));
        form.patch(update.url(student.id), {
            preserveScroll: true,
            onSuccess: () => form.setDefaults(),
        });
    }
    const snapshot = record?.student_snapshot;
    return (
        <>
            <Head title={'Medical record · ' + student.name} />
            <div className="clinic-page">
                <Link
                    href={index({ query: { school_year } })}
                    className="flex w-fit items-center gap-2 text-xs text-muted-foreground hover:text-primary"
                >
                    <ArrowLeft className="size-3.5" />
                    Back to medical clearances
                </Link>
                <PageHeading
                    eyebrow="SCHOOL-YEAR MEDICAL RECORD"
                    title={student.name}
                    description={student.student_number + ' · ' + school_year}
                >
                    <Button variant="outline" onClick={() => setEditing(true)}>
                        <Pencil className="size-3.5" />
                        Edit student information
                    </Button>
                </PageHeading>
                <section className="panel flex flex-wrap items-end justify-between gap-4 p-5">
                    <div>
                        <p className="text-xs font-medium">
                            Current student information
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {student.program} · Year {student.year_level}
                        </p>
                    </div>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            router.get(show.url(student.id), {
                                school_year: targetYear,
                            });
                        }}
                        className="flex items-end gap-2"
                    >
                        <Field
                            label="School year"
                            htmlFor="record-year"
                            error={errors.school_year ?? pageErrors.school_year}
                        >
                            <Input
                                id="record-year"
                                className="w-36"
                                value={targetYear}
                                onChange={(event) =>
                                    setTargetYear(event.target.value)
                                }
                                placeholder="2026-2027"
                                pattern="[0-9]{4}-[0-9]{4}"
                                required
                            />
                        </Field>
                        <Button variant="outline">Open year</Button>
                    </form>
                </section>
                <form onSubmit={submit} className="space-y-5">
                    <fieldset disabled={form.processing} className="space-y-5">
                        <section className="panel">
                            <SectionHeading
                                title={'Medical clearance · ' + school_year}
                                description={
                                    record
                                        ? 'Update this school-year record. Other years are preserved.'
                                        : 'The first save will create this school-year record.'
                                }
                            >
                                <StatusBadge status={form.data.status} />
                            </SectionHeading>
                            {snapshot && (
                                <div className="mx-5 mb-5 rounded-xl border bg-muted/35 p-4 text-xs leading-6">
                                    <p className="font-medium">
                                        Student information saved with this
                                        record
                                    </p>
                                    <p>
                                        {snapshot.name} ·{' '}
                                        {snapshot.student_number}
                                    </p>
                                    <p className="text-muted-foreground">
                                        {snapshot.program} · Year{' '}
                                        {snapshot.year_level}
                                    </p>
                                </div>
                            )}
                            <div className="border-t p-5">
                                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                                    <HeartPulse className="size-4 text-primary" />
                                    Physical examination
                                </h3>
                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    {(
                                        [
                                            ['height_cm', 'Height (cm)', '0.1'],
                                            ['weight_kg', 'Weight (kg)', '0.1'],
                                            [
                                                'temperature_c',
                                                'Temperature (°C)',
                                                '0.1',
                                            ],
                                            [
                                                'bp_systolic',
                                                'BP systolic (mmHg)',
                                                '1',
                                            ],
                                            [
                                                'bp_diastolic',
                                                'BP diastolic (mmHg)',
                                                '1',
                                            ],
                                        ] as const
                                    ).map(([key, label, step]) => (
                                        <Field
                                            key={key}
                                            label={label}
                                            htmlFor={key}
                                            error={errors['exam_data.' + key]}
                                        >
                                            <Input
                                                id={key}
                                                type="number"
                                                min={step}
                                                step={step}
                                                value={form.data.exam_data[key]}
                                                onChange={(event) =>
                                                    setExam(
                                                        key,
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </Field>
                                    ))}
                                </div>
                            </div>
                            <div className="border-t p-5">
                                <h3 className="mb-4 text-sm font-semibold">
                                    Eye test
                                </h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {(
                                        [
                                            ['eye_left', 'Left eye grade'],
                                            ['eye_right', 'Right eye grade'],
                                        ] as const
                                    ).map(([key, label]) => (
                                        <Field
                                            key={key}
                                            label={label}
                                            htmlFor={key}
                                            error={errors['exam_data.' + key]}
                                        >
                                            <Input
                                                id={key}
                                                maxLength={50}
                                                value={form.data.exam_data[key]}
                                                onChange={(event) =>
                                                    setExam(
                                                        key,
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </Field>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4 border-t p-5">
                                <h3 className="text-sm font-semibold">
                                    Physician’s check-up
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Leave information unanswered when it is
                                    unknown or not applicable.
                                </p>
                                <Field
                                    label="Last menstrual period (if applicable)"
                                    htmlFor="last-menstrual-period"
                                    error={
                                        errors[
                                            'exam_data.last_menstrual_period'
                                        ]
                                    }
                                >
                                    <Input
                                        id="last-menstrual-period"
                                        type="date"
                                        value={
                                            form.data.exam_data
                                                .last_menstrual_period
                                        }
                                        onChange={(event) =>
                                            setExam(
                                                'last_menstrual_period',
                                                event.target.value,
                                            )
                                        }
                                        className="sm:max-w-xs"
                                    />
                                </Field>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    {(
                                        [
                                            ['has_cough', 'Cough?'],
                                            ['has_colds', 'Colds?'],
                                            ['has_allergies', 'Allergies?'],
                                        ] as const
                                    ).map(([key, label]) => (
                                        <Field
                                            key={key}
                                            label={label}
                                            htmlFor={key}
                                            error={errors['exam_data.' + key]}
                                        >
                                            <select
                                                id={key}
                                                value={form.data.exam_data[key]}
                                                onChange={(event) =>
                                                    setExam(
                                                        key,
                                                        event.target.value,
                                                    )
                                                }
                                                className="field-input"
                                            >
                                                <option value="">
                                                    Unanswered
                                                </option>
                                                <option value="yes">Yes</option>
                                                <option value="no">No</option>
                                            </select>
                                        </Field>
                                    ))}
                                </div>
                                <Field
                                    label="Allergy details"
                                    htmlFor="allergy-details"
                                    error={errors['exam_data.allergy_details']}
                                >
                                    <textarea
                                        id="allergy-details"
                                        className="field-input min-h-20"
                                        maxLength={1000}
                                        value={
                                            form.data.exam_data.allergy_details
                                        }
                                        onChange={(event) =>
                                            setExam(
                                                'allergy_details',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Field
                                    label="Physician’s notes"
                                    htmlFor="physician-notes"
                                    error={errors['exam_data.physician_notes']}
                                >
                                    <textarea
                                        id="physician-notes"
                                        className="field-input min-h-24"
                                        maxLength={3000}
                                        value={
                                            form.data.exam_data.physician_notes
                                        }
                                        onChange={(event) =>
                                            setExam(
                                                'physician_notes',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                            </div>
                        </section>
                        <section className="panel">
                            <SectionHeading
                                title="Clearance review"
                                description="Verify the three requirements before issuing clearance."
                            />
                            <div className="space-y-5 px-5 pb-5">
                                <div className="grid gap-3 sm:grid-cols-3">
                                    {(
                                        [
                                            [
                                                'physical_exam',
                                                'Physical examination complete',
                                            ],
                                            [
                                                'documents_received',
                                                'Medical documents received',
                                            ],
                                            [
                                                'xray_verified',
                                                'X-ray requirement verified',
                                            ],
                                        ] as const
                                    ).map(([key, label]) => (
                                        <div key={key}>
                                            <label className="flex items-center gap-3 rounded-xl border p-4 text-xs">
                                                <input
                                                    className="size-4 accent-primary"
                                                    type="checkbox"
                                                    checked={form.data[key]}
                                                    onChange={(event) =>
                                                        form.setData(
                                                            key,
                                                            event.target
                                                                .checked,
                                                        )
                                                    }
                                                />
                                                {label}
                                            </label>
                                            {errors[key] && (
                                                <p className="mt-2 text-xs text-destructive">
                                                    {errors[key]}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Field
                                    label="Clearance status"
                                    htmlFor="record-status"
                                    error={form.errors.status}
                                >
                                    <select
                                        id="record-status"
                                        value={form.data.status}
                                        onChange={(event) =>
                                            form.setData(
                                                'status',
                                                event.target.value,
                                            )
                                        }
                                        className="field-input sm:max-w-xs"
                                    >
                                        <option value="pending">
                                            Pending review
                                        </option>
                                        <option value="incomplete">
                                            Incomplete requirements
                                        </option>
                                        <option value="cleared">
                                            Cleared for enrollment
                                        </option>
                                    </select>
                                </Field>
                                <Field
                                    label="Clearance notes"
                                    htmlFor="clearance-notes"
                                    error={form.errors.notes}
                                >
                                    <textarea
                                        id="clearance-notes"
                                        maxLength={3000}
                                        className="field-input min-h-20"
                                        value={form.data.notes}
                                        onChange={(event) =>
                                            form.setData(
                                                'notes',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                {record?.reviewed_at && (
                                    <p className="text-xs text-muted-foreground">
                                        Last reviewed by{' '}
                                        {record.reviewer?.name ??
                                            'clinic staff'}{' '}
                                        · {dateLabel(record.reviewed_at, true)}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                                    <p className="text-xs text-muted-foreground">
                                        {form.isDirty
                                            ? 'You have unsaved changes.'
                                            : 'Changes are saved only when you submit this form.'}
                                    </p>
                                    <Button disabled={form.processing}>
                                        {form.processing ? (
                                            <LoaderCircle className="size-4 animate-spin" />
                                        ) : (
                                            <Save className="size-4" />
                                        )}
                                        Save medical record
                                    </Button>
                                </div>
                            </div>
                        </section>
                    </fieldset>
                </form>
                <ClearanceHistory studentId={student.id} records={history} />
            </div>
            {editing && (
                <StudentDialog
                    student={student}
                    onClose={() => setEditing(false)}
                />
            )}
        </>
    );
}
export default function ClearanceRecordPage(props: Props) {
    return <ClearanceEditor key={props.school_year} {...props} />;
}
ClearanceRecordPage.layout = {
    breadcrumbs: [
        { title: 'Medical clearances', href: index() },
        { title: 'School-year record' },
    ],
};
