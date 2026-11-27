import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    useColorScheme,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ACTIVE_SCHOOL_YEAR,
    PERIODS,
    SERVICES,
    availability,
    bookingDates,
    bookVisit,
    cancelVisit,
    dateLabel,
    periodStarts,
    updateContact,
} from './src/domain';
import type {
    Clearance,
    Period,
    Profile,
    PrototypeState,
    Service,
    Tab,
    Visit,
} from './src/domain';
import {
    Badge,
    Button,
    Card,
    Empty,
    Field,
    Icon,
    Section,
    Sheet,
    T,
    ThemeContext,
    dark,
    light,
    row,
    useTheme,
} from './src/ui';
import type { IconName } from './src/ui';
import { useStudent } from './src/student-provider';

const TABS: { key: Tab; label: string; icon: IconName; selected: IconName }[] =
    [
        { key: 'home', label: 'Home', icon: 'grid-outline', selected: 'grid' },
        {
            key: 'visits',
            label: 'My visits',
            icon: 'calendar-outline',
            selected: 'calendar',
        },
        {
            key: 'records',
            label: 'Records',
            icon: 'shield-checkmark-outline',
            selected: 'shield-checkmark',
        },
        {
            key: 'updates',
            label: 'Updates',
            icon: 'megaphone-outline',
            selected: 'megaphone',
        },
        {
            key: 'profile',
            label: 'Profile',
            icon: 'person-outline',
            selected: 'person',
        },
    ];
type Panel =
    | { kind: 'book' | 'profile' | 'guide' }
    | { kind: 'visit' | 'record' | 'announcement'; id: string }
    | {
          kind: 'notice';
          title: string;
          message: string;
          label?: string;
          confirm?: () => void | Promise<void>;
          destructive?: boolean;
      };
const LABELS = {
    scheduled: 'Scheduled',
    checked_in: 'Checked in',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No-show',
    pending: 'Pending',
    incomplete: 'Incomplete',
    cleared: 'Cleared',
};
function tone(status: string): 'green' | 'blue' | 'amber' | 'muted' {
    return status === 'cleared' || status === 'completed'
        ? 'green'
        : status === 'scheduled'
          ? 'blue'
          : status === 'incomplete' ||
              status === 'pending' ||
              status === 'checked_in'
            ? 'amber'
            : 'muted';
}
function Eyebrow({ label }: { label: string }) {
    const c = useTheme();
    return (
        <T
            size={10}
            weight="700"
            color={c.muted}
            style={{ letterSpacing: 1.8 }}
        >
            {label}
        </T>
    );
}
function CheckRow({ label, done }: { label: string; done: boolean }) {
    const c = useTheme();
    return (
        <View style={[row, { paddingVertical: 10 }]}>
            <Icon
                name={done ? 'checkmark-circle' : 'ellipse-outline'}
                size={23}
                color={done ? c.green : c.muted}
            />
            <T size={13} style={{ flex: 1 }}>
                {label}
            </T>
            <T size={11} color={done ? c.green : c.muted}>
                {done ? 'Complete' : 'To complete'}
            </T>
        </View>
    );
}
function InfoRow({ label, value }: { label: string; value: string }) {
    const c = useTheme();
    return (
        <View
            style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
                gap: 4,
            }}
        >
            <T size={11} color={c.muted}>
                {label}
            </T>
            <T size={14} weight="500">
                {value}
            </T>
        </View>
    );
}

function VisitCard({ visit, onPress }: { visit: Visit; onPress: () => void }) {
    const c = useTheme();
    return (
        <Card
            onPress={onPress}
            accessibilityLabel={
                'Open ' +
                SERVICES[visit.service].label +
                ' appointment on ' +
                dateLabel(visit.date)
            }
        >
            <View
                style={[
                    row,
                    { justifyContent: 'space-between', marginBottom: 15 },
                ]}
            >
                <View
                    style={{
                        backgroundColor: c.greenSoft,
                        borderRadius: 14,
                        padding: 12,
                    }}
                >
                    <Icon name={SERVICES[visit.service].icon} />
                </View>
                <Badge tone={tone(visit.status)}>{LABELS[visit.status]}</Badge>
            </View>
            <T size={17} weight="600">
                {SERVICES[visit.service].label}
            </T>
            <View style={[row, { marginTop: 12, gap: 7 }]}>
                <Icon name="calendar-outline" size={15} color={c.muted} />
                <T size={12} color={c.muted}>
                    {dateLabel(visit.date)}
                </T>
            </View>
            <View style={[row, { marginTop: 6, gap: 7 }]}>
                <Icon name="time-outline" size={15} color={c.muted} />
                <T size={12} color={c.muted}>
                    {PERIODS[visit.period].label} · {PERIODS[visit.period].time}
                </T>
            </View>
            <View
                style={[
                    row,
                    {
                        marginTop: 17,
                        paddingTop: 13,
                        borderTopColor: c.border,
                        borderTopWidth: 1,
                        justifyContent: 'space-between',
                    },
                ]}
            >
                <T size={11} color={c.muted}>
                    {visit.reference}
                </T>
                <Icon name="arrow-forward" size={18} />
            </View>
        </Card>
    );
}
function Calendar({
    dates,
    selected,
    onSelect,
}: {
    dates: string[];
    selected: string;
    onSelect: (date: string) => void;
}) {
    const c = useTheme();
    const [month, setMonth] = useState(selected.slice(0, 7));
    const first = new Date(month + '-01T12:00:00');
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(
        first.getFullYear(),
        first.getMonth() + 1,
        0,
    ).getDate();
    function shift(offset: number) {
        const value = new Date(first);
        value.setMonth(value.getMonth() + offset);
        setMonth(
            value.getFullYear() +
                '-' +
                String(value.getMonth() + 1).padStart(2, '0'),
        );
    }
    return (
        <View style={{ gap: 12 }}>
            <View style={[row, { justifyContent: 'space-between' }]}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                    disabled={month <= dates[0].slice(0, 7)}
                    onPress={() => shift(-1)}
                    style={{
                        padding: 10,
                        opacity: month <= dates[0].slice(0, 7) ? 0.3 : 1,
                    }}
                >
                    <Icon name="chevron-back" size={20} />
                </Pressable>
                <T size={15} weight="600">
                    {first.toLocaleDateString('en-PH', {
                        month: 'long',
                        year: 'numeric',
                    })}
                </T>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                    disabled={month >= dates[dates.length - 1].slice(0, 7)}
                    onPress={() => shift(1)}
                    style={{
                        padding: 10,
                        opacity:
                            month >= dates[dates.length - 1].slice(0, 7)
                                ? 0.3
                                : 1,
                    }}
                >
                    <Icon name="chevron-forward" size={20} />
                </Pressable>
            </View>
            <View style={{ flexDirection: 'row' }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                    <View
                        key={index}
                        style={{ width: '14.2857%', alignItems: 'center' }}
                    >
                        <T size={11} color={c.muted}>
                            {day}
                        </T>
                    </View>
                ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {Array.from({ length: offset + count }, (_, index) => {
                    const day = index - offset + 1;
                    const date = month + '-' + String(day).padStart(2, '0');
                    const open = day > 0 && dates.includes(date);
                    return (
                        <View
                            key={index}
                            style={{ width: '14.2857%', padding: 2 }}
                        >
                            {day > 0 ? (
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={dateLabel(date, {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                    accessibilityState={{
                                        disabled: !open,
                                        selected: date === selected,
                                    }}
                                    disabled={!open}
                                    onPress={() => onSelect(date)}
                                    style={{
                                        height: 44,
                                        borderRadius: 14,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor:
                                            date === selected
                                                ? '#246A50'
                                                : 'transparent',
                                        opacity: open ? 1 : 0.25,
                                    }}
                                >
                                    <T
                                        size={13}
                                        weight={
                                            date === selected ? '700' : '400'
                                        }
                                        color={
                                            date === selected
                                                ? '#FFFFFF'
                                                : c.ink
                                        }
                                    >
                                        {day}
                                    </T>
                                </Pressable>
                            ) : (
                                <View style={{ height: 44 }} />
                            )}
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
function BookingForm({
    state,
    busy,
    saveError,
    onBook,
}: {
    state: PrototypeState;
    busy: boolean;
    saveError: string | null;
    onBook: (next: PrototypeState) => Promise<void>;
}) {
    const c = useTheme();
    const dates = bookingDates();
    const [service, setService] = useState<Service>('physical_exam');
    const [date, setDate] = useState(
        dates.find((day) => {
            const slots = availability(state, day);
            return slots.morning > 0 || slots.afternoon > 0;
        }) ?? dates[0],
    );
    const [period, setPeriod] = useState<Period | null>(null);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const slots = availability(state, date);
    async function submit() {
        if (!period) return;
        try {
            setError('');
            await onBook(bookVisit(state, { date, service, period, notes }));
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'Please check your booking details.',
            );
        }
    }
    return (
        <>
            <Badge>CLINIC APPOINTMENT</Badge>
            <T size={13} color={c.muted}>
                Choose a service, a clinic date, and a booking period. Your
                appointment is shared with the clinic staff portal.
            </T>
            <Eyebrow label="01 / YOUR VISIT" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {(Object.keys(SERVICES) as Service[]).map((key) => (
                    <Pressable
                        key={key}
                        accessibilityRole="button"
                        accessibilityLabel={SERVICES[key].label}
                        accessibilityState={{ selected: service === key }}
                        disabled={busy}
                        onPress={() => setService(key)}
                        style={{
                            width: '48%',
                            padding: 14,
                            borderRadius: 16,
                            borderColor: service === key ? c.green : c.border,
                            borderWidth: 1,
                            backgroundColor:
                                service === key ? c.greenSoft : c.surface,
                            gap: 8,
                        }}
                    >
                        <Icon name={SERVICES[key].icon} size={24} />
                        <T size={12} weight="600">
                            {SERVICES[key].short}
                        </T>
                    </Pressable>
                ))}
            </View>
            <T size={12} color={c.muted}>
                {SERVICES[service].description}
            </T>
            <Eyebrow label="02 / CHOOSE A DATE" />
            <Calendar
                dates={dates}
                selected={date}
                onSelect={(value) => {
                    setDate(value);
                    setPeriod(null);
                    setError('');
                }}
            />
            <Eyebrow label="03 / BOOKING PERIOD" />
            {(Object.keys(PERIODS) as Period[]).map((key) => {
                const occupied = state.visits.some(
                    (visit) =>
                        visit.date === date &&
                        visit.period === key &&
                        visit.status !== 'cancelled',
                );
                const started = periodStarts(date, key).getTime() <= Date.now();
                const disabled = slots[key] <= 0 || occupied || busy;
                return (
                    <Pressable
                        key={key}
                        accessibilityRole="button"
                        accessibilityLabel={
                            PERIODS[key].label + ' booking period'
                        }
                        accessibilityState={{
                            selected: period === key,
                            disabled,
                        }}
                        disabled={disabled}
                        onPress={() => setPeriod(key)}
                        style={[
                            row,
                            {
                                justifyContent: 'space-between',
                                borderColor:
                                    period === key ? c.green : c.border,
                                borderWidth: 1,
                                borderRadius: 16,
                                padding: 16,
                                backgroundColor:
                                    period === key ? c.greenSoft : c.surface,
                                opacity: disabled ? 0.48 : 1,
                            },
                        ]}
                    >
                        <View>
                            <T weight="600">{PERIODS[key].label}</T>
                            <T size={12} color={c.muted}>
                                {PERIODS[key].time}
                            </T>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <Icon
                                name={
                                    period === key
                                        ? 'radio-button-on'
                                        : 'radio-button-off'
                                }
                                size={20}
                            />
                            <T size={11} color={c.muted}>
                                {occupied
                                    ? 'Already booked'
                                    : started
                                      ? 'Started'
                                      : slots[key] <= 0
                                        ? 'Full'
                                        : slots[key] + ' places left'}
                            </T>
                        </View>
                    </Pressable>
                );
            })}
            <Field
                label="Visit notes (optional)"
                placeholder="Anything you’d like the clinic team to know"
                multiline
                maxLength={1000}
                value={notes}
                onChangeText={setNotes}
                editable={!busy}
                style={{ minHeight: 90, textAlignVertical: 'top' }}
            />
            {(error || saveError) && (
                <T color={c.danger} size={12}>
                    {error || saveError}
                </T>
            )}
            <Button
                loading={busy}
                disabled={!period}
                icon="checkmark"
                onPress={() => void submit()}
            >
                Reserve appointment
            </Button>
            <T size={11} color={c.muted} style={{ textAlign: 'center' }}>
                Clinic times use Philippine time. Full or started periods cannot
                be booked.
            </T>
        </>
    );
}
function ContactForm({
    profile,
    busy,
    saveError,
    onSave,
}: {
    profile: Profile;
    busy: boolean;
    saveError: string | null;
    onSave: (input: {
        name: string;
        email: string;
        phone: string;
    }) => Promise<void>;
}) {
    const c = useTheme();
    const [name, setName] = useState(profile.name);
    const [email, setEmail] = useState(profile.email);
    const [phone, setPhone] = useState(profile.phone);
    const [error, setError] = useState('');
    return (
        <>
            <T color={c.muted} size={13}>
                Update your contact number. Your account identity and academic
                information are managed by clinic staff.
            </T>
            <Field
                label="Full name"
                autoComplete="name"
                value={name}
                onChangeText={setName}
                maxLength={100}
                editable={false}
            />
            <Field
                label="Email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                maxLength={150}
                editable={false}
            />
            <Field
                label="Contact number (optional)"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={30}
                editable={!busy}
            />
            {(error || saveError) && (
                <T size={12} color={c.danger}>
                    {error || saveError}
                </T>
            )}
            <Button
                loading={busy}
                onPress={() => {
                    setError('');
                    void onSave({ name, email, phone }).catch((error) =>
                        setError(
                            error instanceof Error
                                ? error.message
                                : 'Please check your contact details.',
                        ),
                    );
                }}
            >
                Save contact details
            </Button>
        </>
    );
}
function Guide({ ask }: { ask: (question: string) => Promise<string> }) {
    const c = useTheme();
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState<
        { question: string; answer: string }[]
    >([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function send(value: string) {
        if (!value.trim() || busy) return;
        setBusy(true);
        setError('');
        try {
            const answer = await ask(value.trim().slice(0, 500));
            setMessages((items) => [
                ...items,
                { question: value.trim(), answer },
            ]);
            setQuestion('');
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : 'The guide is unavailable.',
            );
        } finally {
            setBusy(false);
        }
    }
    return (
        <>
            <Badge>AI STUDENT GUIDE</Badge>
            <T color={c.muted} size={13}>
                Ask about using the app. Questions go to Neon AI Gateway. Keep
                medical details private; contact the clinic for medical advice.
            </T>
            {error && (
                <T color={c.danger} size={12}>
                    {error}
                </T>
            )}
            {messages.map((message, index) => (
                <View key={index} style={{ gap: 10 }}>
                    <View
                        style={{
                            alignSelf: 'flex-end',
                            maxWidth: '92%',
                            backgroundColor: c.greenSoft,
                            padding: 14,
                            borderRadius: 17,
                        }}
                    >
                        <T size={13}>{message.question}</T>
                    </View>
                    <Card>
                        <View style={[row, { marginBottom: 8 }]}>
                            <Icon name="sparkles-outline" size={17} />
                            <T size={11} weight="600">
                                STUDENT GUIDE
                            </T>
                        </View>
                        <T size={13}>{message.answer}</T>
                    </Card>
                </View>
            ))}
            {messages.length === 0 &&
                [
                    'How do I book a visit?',
                    'What does my clearance status mean?',
                    'Can I cancel an appointment?',
                ].map((item) => (
                    <Card
                        key={item}
                        onPress={() => send(item)}
                        style={{ padding: 15 }}
                    >
                        <View
                            style={[row, { justifyContent: 'space-between' }]}
                        >
                            <T size={12} style={{ flex: 1 }}>
                                {item}
                            </T>
                            <Icon name="arrow-forward" size={17} />
                        </View>
                    </Card>
                ))}
            <Field
                label="Your question"
                placeholder="Ask about booking or clearance..."
                value={question}
                onChangeText={setQuestion}
                maxLength={500}
                onSubmitEditing={() => send(question)}
                returnKeyType="send"
            />
            <Button
                icon="arrow-up"
                disabled={!question.trim() || busy}
                loading={busy}
                onPress={() => send(question)}
            >
                Ask the guide
            </Button>
        </>
    );
}
function ClearanceDetails({ record }: { record: Clearance }) {
    const c = useTheme();
    return (
        <>
            <View style={[row, { justifyContent: 'space-between' }]}>
                <Eyebrow label={'SCHOOL YEAR ' + record.schoolYear} />
                <Badge tone={tone(record.status)}>
                    {LABELS[record.status]}
                </Badge>
            </View>
            <T color={c.muted} size={13}>
                Year {record.yearLevel} at the time of this record. Clinic staff
                manage examination results and clearance status.
            </T>
            <Card>
                <CheckRow
                    label="Physical examination"
                    done={record.physicalExam}
                />
                <CheckRow
                    label="Medical documents"
                    done={record.documentsReceived}
                />
                <CheckRow
                    label="X-ray requirement"
                    done={record.xrayVerified}
                />
            </Card>
            <T size={13}>{record.notes}</T>
            {record.exam ? (
                <>
                    <Section title="Physical examination" />
                    <Card>
                        <View
                            style={{ flexDirection: 'row', flexWrap: 'wrap' }}
                        >
                            {[
                                [
                                    'Height',
                                    record.exam.height == null
                                        ? 'Not recorded'
                                        : record.exam.height + ' cm',
                                ],
                                [
                                    'Weight',
                                    record.exam.weight == null
                                        ? 'Not recorded'
                                        : record.exam.weight + ' kg',
                                ],
                                [
                                    'Blood pressure',
                                    record.exam.bp
                                        ? record.exam.bp + ' mmHg'
                                        : 'Not recorded',
                                ],
                                [
                                    'Temperature',
                                    record.exam.temperature == null
                                        ? 'Not recorded'
                                        : record.exam.temperature + ' °C',
                                ],
                            ].map(([label, value]) => (
                                <View
                                    key={label}
                                    style={{ width: '50%', paddingBottom: 17 }}
                                >
                                    <T size={11} color={c.muted}>
                                        {label}
                                    </T>
                                    <T size={17} weight="600">
                                        {value}
                                    </T>
                                </View>
                            ))}
                        </View>
                        <InfoRow label="Left eye" value={record.exam.leftEye} />
                        <InfoRow
                            label="Right eye"
                            value={record.exam.rightEye}
                        />
                    </Card>
                    <Section title="Physician’s notes" />
                    <Card>
                        <T size={13}>{record.exam.physicianNotes}</T>
                    </Card>
                </>
            ) : (
                <Empty
                    title="Examination not recorded yet"
                    description="Your results will appear here after the clinic adds them."
                    icon="heart-outline"
                />
            )}
            {record.reviewedAt && (
                <T size={11} color={c.muted}>
                    Reviewed {dateLabel(record.reviewedAt)}
                </T>
            )}
        </>
    );
}
function StudentApp() {
    const prototype = useStudent();
    const state = prototype.state;
    const ANNOUNCEMENTS = state?.announcements ?? [];
    const systemTheme = useColorScheme();
    const isDark =
        state?.theme === 'dark' ||
        (state?.theme !== 'light' && systemTheme === 'dark');
    const c = isDark ? dark : light;
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ tab: string }>();
    const tab: Tab = TABS.some((item) => item.key === params.tab)
        ? (params.tab as Tab)
        : 'home';
    const setTab = (next: Tab) => router.replace('/' + next);
    const [panel, setPanel] = useState<Panel | null>(null);
    const [visitFilter, setVisitFilter] = useState<'upcoming' | 'history'>(
        'upcoming',
    );
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);
    const notice = (title: string, message: string) =>
        setPanel({ kind: 'notice', title, message });
    const upcoming =
        state?.visits
            .filter(
                (visit) =>
                    (visit.status === 'scheduled' &&
                        periodStarts(visit.date, visit.period).getTime() >
                            now.getTime()) ||
                    visit.status === 'checked_in',
            )
            .sort(
                (a, b) =>
                    periodStarts(a.date, a.period).getTime() -
                    periodStarts(b.date, b.period).getTime(),
            ) ?? [];
    const current = state?.clearances.find(
        (record) => record.schoolYear === ACTIVE_SCHOOL_YEAR,
    );
    const unread = ANNOUNCEMENTS.filter(
        (item) => !state?.readAnnouncements.includes(item.id),
    ).length;
    async function openAnnouncement(id: string) {
        if (!state || prototype.busy) return;
        if (!state.readAnnouncements.includes(id))
            await prototype.save({
                ...state,
                readAnnouncements: [...state.readAnnouncements, id],
            });
        setPanel({ kind: 'announcement', id });
    }
    function reset() {
        setPanel({
            kind: 'notice',
            title: 'Sign out of your account?',
            message:
                'Your reservations and records stay saved in your Neon account.',
            label: 'Sign out',
            destructive: true,
            confirm: async () => {
                await prototype.signOut();
                setPanel(null);
            },
        });
    }
    function header() {
        return (
            <View
                style={{
                    paddingHorizontal: 24,
                    paddingTop: Math.max(insets.top + 12, 22),
                    paddingBottom: 13,
                    backgroundColor: c.bg,
                }}
            >
                <View style={[row, { justifyContent: 'space-between' }]}>
                    <View style={[row, { gap: 9 }]}>
                        <View
                            style={{
                                backgroundColor: c.greenSoft,
                                borderRadius: 13,
                                padding: 10,
                            }}
                        >
                            <Icon name="heart-outline" size={23} />
                        </View>
                        <View>
                            <T size={15} weight="700">
                                NEU Health
                            </T>
                            <T
                                size={9}
                                color={c.muted}
                                style={{ letterSpacing: 1.3 }}
                            >
                                STUDENT COMPANION
                            </T>
                        </View>
                    </View>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Open your profile"
                        onPress={() => setTab('profile')}
                        style={{
                            width: 43,
                            height: 43,
                            borderRadius: 16,
                            backgroundColor: c.greenSoft,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <T size={13} weight="700" color={c.green}>
                            {state?.profile.name
                                .split(' ')
                                .map((word) => word[0])
                                .slice(0, 2)
                                .join('')}
                        </T>
                    </Pressable>
                </View>
                <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                        notice(
                            'Your student space is connected',
                            'Your account, appointments and clearance records sync with the clinic staff portal. Only dates opened by the clinic can be booked.',
                        )
                    }
                    style={{ marginTop: 12, alignSelf: 'flex-start' }}
                >
                    <T size={10} color={c.muted}>
                        ● Clinic · {prototype.liveStatus}
                    </T>
                </Pressable>
            </View>
        );
    }
    function home() {
        if (!state) return null;
        return (
            <>
                <View style={{ gap: 4 }}>
                    <T size={14} color={c.muted}>
                        Hello, {state.profile.name.split(' ')[0]}.
                    </T>
                    <T size={29} weight="700" style={{ letterSpacing: -1.2 }}>
                        A little care,{'\n'}every day.
                    </T>
                </View>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Book a clinic visit"
                    onPress={() => setPanel({ kind: 'book' })}
                    style={{
                        backgroundColor: c.hero,
                        borderRadius: 25,
                        padding: 23,
                        gap: 13,
                        overflow: 'hidden',
                    }}
                >
                    <View
                        style={{
                            position: 'absolute',
                            width: 150,
                            height: 150,
                            backgroundColor: '#FFFFFF06',
                            right: -35,
                            bottom: -40,
                            borderRadius: 80,
                        }}
                    />
                    <View style={[row, { justifyContent: 'space-between' }]}>
                        <T
                            size={10}
                            weight="600"
                            color={c.heroText}
                            style={{ letterSpacing: 1.7 }}
                        >
                            HERE WHEN YOU NEED US
                        </T>
                        <Icon
                            name="medical-outline"
                            color={c.heroText}
                            size={28}
                        />
                    </View>
                    <T
                        size={24}
                        weight="600"
                        color="#FFFFFF"
                        style={{ lineHeight: 31, maxWidth: 230 }}
                    >
                        Make room{'\n'}for your wellbeing.
                    </T>
                    <View style={[row, { marginTop: 4 }]}>
                        <View
                            style={{
                                backgroundColor: '#E0F0E6',
                                borderRadius: 11,
                                paddingVertical: 10,
                                paddingHorizontal: 14,
                                flexDirection: 'row',
                                gap: 12,
                                alignItems: 'center',
                            }}
                        >
                            <T color="#174D3B" weight="600" size={12}>
                                Book a visit
                            </T>
                            <Icon
                                name="arrow-forward"
                                size={16}
                                color="#174D3B"
                            />
                        </View>
                    </View>
                </Pressable>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Card
                        style={{ flex: 1, padding: 17 }}
                        onPress={() => setTab('records')}
                    >
                        <View style={{ marginBottom: 13 }}>
                            <Icon name="shield-checkmark-outline" />
                        </View>
                        <T size={11} color={c.muted}>
                            Medical clearance
                        </T>
                        <T size={17} weight="700" style={{ marginTop: 3 }}>
                            {current ? LABELS[current.status] : 'Pending'}
                        </T>
                        <T size={10} color={c.muted} style={{ marginTop: 5 }}>
                            SY {ACTIVE_SCHOOL_YEAR}
                        </T>
                    </Card>
                    <Card
                        style={{ flex: 1, padding: 17 }}
                        onPress={() => setTab('visits')}
                    >
                        <View style={{ marginBottom: 13 }}>
                            <Icon name="calendar-outline" color={c.blue} />
                        </View>
                        <T size={11} color={c.muted}>
                            Upcoming visits
                        </T>
                        <T size={25} weight="700">
                            {upcoming.length.toString().padStart(2, '0')}
                        </T>
                        <T size={10} color={c.muted}>
                            A little planning helps.
                        </T>
                    </Card>
                </View>
                <Section
                    title="Your next visit"
                    action="View all"
                    onPress={() => setTab('visits')}
                />
                {upcoming[0] ? (
                    <VisitCard
                        visit={upcoming[0]}
                        onPress={() =>
                            setPanel({ kind: 'visit', id: upcoming[0].id })
                        }
                    />
                ) : (
                    <Empty
                        title="Your calendar has room"
                        description="Book a clinic visit whenever you need one."
                    />
                )}
                <Card
                    onPress={() => setPanel({ kind: 'guide' })}
                    style={{
                        backgroundColor: c.greenSoft,
                        borderColor: c.greenSoft,
                        padding: 17,
                    }}
                >
                    <View style={row}>
                        <View
                            style={{
                                padding: 10,
                                backgroundColor: c.surface,
                                borderRadius: 13,
                            }}
                        >
                            <Icon name="sparkles-outline" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <T weight="600" size={14}>
                                A little guidance?
                            </T>
                            <T size={11} color={c.muted}>
                                Ask the AI student guide.
                            </T>
                        </View>
                        <Icon name="arrow-forward" size={19} />
                    </View>
                </Card>
                <Section
                    title="Around the clinic"
                    action="All updates"
                    onPress={() => setTab('updates')}
                />
                {ANNOUNCEMENTS.length > 0 ? (
                    <Card
                        onPress={() =>
                            void openAnnouncement(ANNOUNCEMENTS[0].id)
                        }
                    >
                        <View style={[row, { marginBottom: 12 }]}>
                            <Icon name={ANNOUNCEMENTS[0].icon} size={21} />
                            <Eyebrow label={ANNOUNCEMENTS[0].category} />
                        </View>
                        <T size={18} weight="600">
                            {ANNOUNCEMENTS[0].title}
                        </T>
                        <T size={12} color={c.muted} style={{ marginTop: 7 }}>
                            {ANNOUNCEMENTS[0].summary}
                        </T>
                    </Card>
                ) : (
                    <Empty
                        title="No updates yet"
                        description="Clinic announcements will appear here."
                    />
                )}
            </>
        );
    }
    function visits() {
        if (!state) return null;
        const list =
            visitFilter === 'upcoming'
                ? upcoming
                : state.visits
                      .filter(
                          (visit) =>
                              !upcoming.some((item) => item.id === visit.id),
                      )
                      .sort((a, b) => b.date.localeCompare(a.date));
        return (
            <>
                <Eyebrow label="APPOINTMENTS" />
                <T size={29} weight="700" style={{ letterSpacing: -1.1 }}>
                    Your next step{'\n'}to care.
                </T>
                <T size={13} color={c.muted}>
                    Choose a visit that fits your day. Keep your booking
                    reference ready for the clinic.
                </T>
                <Button icon="add" onPress={() => setPanel({ kind: 'book' })}>
                    Book a visit
                </Button>
                <View
                    style={{
                        flexDirection: 'row',
                        padding: 5,
                        borderRadius: 15,
                        backgroundColor: c.border,
                    }}
                >
                    {(['upcoming', 'history'] as const).map((value) => (
                        <Pressable
                            key={value}
                            accessibilityRole="button"
                            accessibilityState={{
                                selected: visitFilter === value,
                            }}
                            onPress={() => setVisitFilter(value)}
                            style={{
                                flex: 1,
                                alignItems: 'center',
                                padding: 11,
                                borderRadius: 11,
                                backgroundColor:
                                    visitFilter === value
                                        ? c.surface
                                        : 'transparent',
                            }}
                        >
                            <T
                                size={12}
                                weight="600"
                                color={visitFilter === value ? c.ink : c.muted}
                            >
                                {value === 'upcoming' ? 'Upcoming' : 'History'}
                            </T>
                        </Pressable>
                    ))}
                </View>
                {list.length ? (
                    list.map((visit) => (
                        <VisitCard
                            key={visit.id}
                            visit={visit}
                            onPress={() =>
                                setPanel({ kind: 'visit', id: visit.id })
                            }
                        />
                    ))
                ) : (
                    <Empty
                        title={
                            visitFilter === 'upcoming'
                                ? 'No upcoming visits'
                                : 'No visit history yet'
                        }
                        description={
                            visitFilter === 'upcoming'
                                ? 'Your next reservation will appear here.'
                                : 'Completed and cancelled visits stay here for reference.'
                        }
                    />
                )}
            </>
        );
    }
    function records() {
        if (!state) return null;
        return (
            <>
                <Eyebrow label="MEDICAL CLEARANCE" />
                <T size={29} weight="700" style={{ letterSpacing: -1.1 }}>
                    Your health,{'\n'}on record.
                </T>
                <T size={13} color={c.muted}>
                    A separate record for every school year. Clinic staff review
                    your requirements and examination results.
                </T>
                {current && (
                    <Card>
                        <View
                            style={[
                                row,
                                {
                                    justifyContent: 'space-between',
                                    marginBottom: 14,
                                },
                            ]}
                        >
                            <Eyebrow label={'SY ' + current.schoolYear} />
                            <Badge tone={tone(current.status)}>
                                {LABELS[current.status]}
                            </Badge>
                        </View>
                        <T size={18} weight="600">
                            A few steps toward clearance.
                        </T>
                        <T
                            size={12}
                            color={c.muted}
                            style={{ marginTop: 8, marginBottom: 13 }}
                        >
                            {current.notes}
                        </T>
                        <CheckRow
                            label="Physical examination"
                            done={current.physicalExam}
                        />
                        <CheckRow
                            label="Medical documents"
                            done={current.documentsReceived}
                        />
                        <CheckRow
                            label="X-ray requirement"
                            done={current.xrayVerified}
                        />
                        <Button
                            secondary
                            onPress={() =>
                                setPanel({ kind: 'record', id: current.id })
                            }
                            style={{ marginTop: 15 }}
                        >
                            View this year’s record
                        </Button>
                    </Card>
                )}
                <Section title="School-year history" />
                {state.clearances.map((record) => (
                    <Card
                        key={record.id}
                        onPress={() =>
                            setPanel({ kind: 'record', id: record.id })
                        }
                        style={{ padding: 18 }}
                    >
                        <View
                            style={[row, { justifyContent: 'space-between' }]}
                        >
                            <View style={[row, { flex: 1 }]}>
                                <View
                                    style={{
                                        padding: 11,
                                        borderRadius: 13,
                                        backgroundColor: c.greenSoft,
                                    }}
                                >
                                    <Icon name="document-text-outline" />
                                </View>
                                <View>
                                    <T weight="600" size={15}>
                                        {record.schoolYear}
                                    </T>
                                    <T size={11} color={c.muted}>
                                        Year {record.yearLevel} · Medical
                                        clearance
                                    </T>
                                </View>
                            </View>
                            <Icon name="chevron-forward" size={18} />
                        </View>
                        <View style={{ marginTop: 12 }}>
                            <Badge tone={tone(record.status)}>
                                {LABELS[record.status]}
                            </Badge>
                        </View>
                    </Card>
                ))}
                <T size={11} color={c.muted}>
                    Appointment status and medical clearance are tracked
                    separately.
                </T>
            </>
        );
    }
    function updates() {
        if (!state) return null;
        return (
            <>
                <Eyebrow label="CLINIC UPDATES" />
                <T size={29} weight="700" style={{ letterSpacing: -1.1 }}>
                    From your{'\n'}campus clinic.
                </T>
                <T size={13} color={c.muted}>
                    Helpful reminders, health programs, and the things to know
                    before your next visit.
                </T>
                {ANNOUNCEMENTS.map((item, index) => (
                    <Card
                        key={item.id}
                        onPress={() => void openAnnouncement(item.id)}
                    >
                        <View
                            style={{
                                height: index === 0 ? 120 : 76,
                                backgroundColor:
                                    item.color === 'blue'
                                        ? c.blueSoft
                                        : item.color === 'amber'
                                          ? c.amberSoft
                                          : c.greenSoft,
                                borderRadius: 16,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 18,
                            }}
                        >
                            <Icon
                                name={item.icon}
                                size={index === 0 ? 49 : 32}
                                color={
                                    item.color === 'blue'
                                        ? c.blue
                                        : item.color === 'amber'
                                          ? c.amber
                                          : c.green
                                }
                            />
                        </View>
                        <View
                            style={[
                                row,
                                {
                                    justifyContent: 'space-between',
                                    marginBottom: 10,
                                },
                            ]}
                        >
                            <Eyebrow label={item.category} />
                            {!state.readAnnouncements.includes(item.id) && (
                                <Badge tone="blue">NEW</Badge>
                            )}
                        </View>
                        <T size={20} weight="600" style={{ lineHeight: 27 }}>
                            {item.title}
                        </T>
                        <T size={12} color={c.muted} style={{ marginTop: 9 }}>
                            {item.summary}
                        </T>
                        <View style={[row, { marginTop: 17 }]}>
                            <T size={11} weight="600" color={c.green}>
                                Read update
                            </T>
                            <Icon name="arrow-forward" size={15} />
                        </View>
                    </Card>
                ))}
            </>
        );
    }
    function profile() {
        if (!state) return null;
        return (
            <>
                <Eyebrow label="YOUR STUDENT SPACE" />
                <T size={29} weight="700" style={{ letterSpacing: -1.1 }}>
                    A space just{'\n'}for you.
                </T>
                <Card
                    style={{
                        alignItems: 'center',
                        gap: 9,
                        paddingVertical: 25,
                    }}
                >
                    <View
                        style={{
                            width: 75,
                            height: 75,
                            borderRadius: 26,
                            backgroundColor: c.greenSoft,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 5,
                        }}
                    >
                        <T size={24} color={c.green} weight="700">
                            {state.profile.name
                                .split(' ')
                                .map((word) => word[0])
                                .slice(0, 2)
                                .join('')}
                        </T>
                    </View>
                    <T size={21} weight="700">
                        {state.profile.name}
                    </T>
                    <T size={12} color={c.muted}>
                        {state.profile.studentNumber}
                    </T>
                    <Badge>STUDENT ACCOUNT</Badge>
                </Card>
                <Card>
                    <InfoRow label="Program" value={state.profile.program} />
                    <InfoRow
                        label="Year level"
                        value={'Year ' + state.profile.yearLevel}
                    />
                    <InfoRow label="Email" value={state.profile.email} />
                    <InfoRow
                        label="Contact number"
                        value={state.profile.phone || 'Not provided'}
                    />
                    <Button
                        secondary
                        icon="create-outline"
                        onPress={() => setPanel({ kind: 'profile' })}
                        style={{ marginTop: 18 }}
                    >
                        Edit contact details
                    </Button>
                </Card>
                <Section title="Make yourself comfortable" />
                <Card>
                    <T size={13} weight="600" style={{ marginBottom: 14 }}>
                        Appearance
                    </T>
                    <View style={{ flexDirection: 'row', gap: 7 }}>
                        {(['system', 'light', 'dark'] as const).map((value) => (
                            <Pressable
                                key={value}
                                accessibilityRole="button"
                                accessibilityState={{
                                    selected: state.theme === value,
                                    disabled: prototype.busy,
                                }}
                                disabled={prototype.busy}
                                onPress={() =>
                                    void prototype.save({
                                        ...state,
                                        theme: value,
                                    })
                                }
                                style={{
                                    flex: 1,
                                    borderRadius: 12,
                                    padding: 12,
                                    alignItems: 'center',
                                    backgroundColor:
                                        state.theme === value
                                            ? c.greenSoft
                                            : c.input,
                                }}
                            >
                                <Icon
                                    name={
                                        value === 'system'
                                            ? 'phone-portrait-outline'
                                            : value === 'light'
                                              ? 'sunny-outline'
                                              : 'moon-outline'
                                    }
                                    size={20}
                                />
                                <T size={11} style={{ marginTop: 6 }}>
                                    {value[0].toUpperCase() + value.slice(1)}
                                </T>
                            </Pressable>
                        ))}
                    </View>
                </Card>
                <Card>
                    <View style={[row, { marginBottom: 10 }]}>
                        <Icon name="cloud-done-outline" />
                        <T weight="600">Connected to your clinic</T>
                    </View>
                    <T size={12} color={c.muted}>
                        Your appointments and clearance records are shared with
                        clinic staff. Updates sync across your devices.
                    </T>
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => setPanel({ kind: 'guide' })}
                        style={{ paddingVertical: 14 }}
                    >
                        <T size={12} weight="600" color={c.green}>
                            Open student guide →
                        </T>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        disabled={prototype.busy}
                        onPress={reset}
                        style={{ paddingVertical: 10 }}
                    >
                        <T size={12} color={c.danger}>
                            Sign out
                        </T>
                    </Pressable>
                </Card>
                <T size={10} color={c.muted} style={{ textAlign: 'center' }}>
                    NEU Health Student · Prototype 0.2.0
                </T>
            </>
        );
    }
    function panelContent() {
        if (!panel || !state) return null;
        if (panel.kind === 'book')
            return (
                <BookingForm
                    state={state}
                    busy={prototype.busy}
                    saveError={prototype.error}
                    onBook={async (next) => {
                        const saved = await prototype.save(next);
                        if (saved) {
                            setVisitFilter('upcoming');
                            notice(
                                'Your visit is reserved.',
                                saved.visits[0].reference +
                                    '\n\nYour appointment is saved and visible to clinic staff.',
                            );
                        }
                    }}
                />
            );
        if (panel.kind === 'profile')
            return (
                <ContactForm
                    profile={state.profile}
                    busy={prototype.busy}
                    saveError={prototype.error}
                    onSave={async (input) => {
                        const next = updateContact(state, input);
                        if (await prototype.save(next))
                            notice(
                                'Details saved.',
                                'Your contact number has been saved to your account. School-year records are preserved.',
                            );
                    }}
                />
            );
        if (panel.kind === 'guide') return <Guide ask={prototype.ask} />;
        if (panel.kind === 'notice')
            return (
                <>
                    <View
                        style={{
                            alignSelf: 'flex-start',
                            padding: 14,
                            borderRadius: 18,
                            backgroundColor: panel.destructive
                                ? c.amberSoft
                                : c.greenSoft,
                        }}
                    >
                        <Icon
                            name={
                                panel.destructive
                                    ? 'alert-circle-outline'
                                    : 'checkmark-circle-outline'
                            }
                            size={31}
                        />
                    </View>
                    <T size={14} color={c.muted}>
                        {panel.message}
                    </T>
                    {prototype.error && (
                        <T size={12} color={c.danger}>
                            {prototype.error}
                        </T>
                    )}
                    <Button
                        loading={prototype.busy}
                        style={
                            panel.destructive
                                ? { backgroundColor: '#A54D49' }
                                : undefined
                        }
                        onPress={() => {
                            if (panel.confirm) void panel.confirm();
                            else setPanel(null);
                        }}
                    >
                        {panel.label ?? 'Got it'}
                    </Button>
                    {panel.confirm && (
                        <Button
                            secondary
                            disabled={prototype.busy}
                            onPress={() => setPanel(null)}
                        >
                            Go back
                        </Button>
                    )}
                </>
            );
        if (panel.kind === 'record') {
            const record = state.clearances.find(
                (item) => item.id === panel.id,
            );
            return record ? <ClearanceDetails record={record} /> : null;
        }
        if (panel.kind === 'announcement') {
            const item = ANNOUNCEMENTS.find((item) => item.id === panel.id);
            return item ? (
                <>
                    <Badge>{item.category}</Badge>
                    <Icon name={item.icon} size={48} />
                    <T size={25} weight="700" style={{ lineHeight: 33 }}>
                        {item.title}
                    </T>
                    <T size={14} color={c.muted}>
                        {item.body}
                    </T>
                    <T size={10} color={c.muted}>
                        SAMPLE CLINIC ANNOUNCEMENT
                    </T>
                </>
            ) : null;
        }
        if (panel.kind !== 'visit') return null;
        const visit = state.visits.find((item) => item.id === panel.id);
        if (!visit) return null;
        const cancellable =
            visit.status === 'scheduled' &&
            periodStarts(visit.date, visit.period).getTime() > Date.now();
        return (
            <>
                <Badge tone={tone(visit.status)}>{LABELS[visit.status]}</Badge>
                <T size={24} weight="700">
                    {SERVICES[visit.service].label}
                </T>
                <Card>
                    <InfoRow
                        label="Clinic date"
                        value={dateLabel(visit.date, {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    />
                    <InfoRow
                        label="Booking period"
                        value={
                            PERIODS[visit.period].label +
                            ' · ' +
                            PERIODS[visit.period].time
                        }
                    />
                    <InfoRow label="Student" value={state.profile.name} />
                    <InfoRow
                        label="Booking reference"
                        value={visit.reference}
                    />
                    {visit.notes ? (
                        <InfoRow label="Visit notes" value={visit.notes} />
                    ) : null}
                </Card>
                <Button
                    secondary
                    icon="copy-outline"
                    onPress={() => {
                        void Clipboard.setStringAsync(visit.reference)
                            .then(() =>
                                notice(
                                    'Reference copied.',
                                    'Your booking reference is ready to paste.',
                                ),
                            )
                            .catch(() =>
                                notice(
                                    'Could not copy.',
                                    'You can still read your booking reference in My visits.',
                                ),
                            );
                    }}
                >
                    Copy booking reference
                </Button>
                <T color={c.muted} size={12}>
                    This appointment is shared with clinic staff. Keep your
                    reference ready for arrival verification.
                </T>
                {cancellable && (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() =>
                            setPanel({
                                kind: 'notice',
                                title: 'Cancel this visit?',
                                message:
                                    'The reservation will move to your visit history and release its place in the clinic schedule.',
                                label: 'Cancel visit',
                                destructive: true,
                                confirm: async () => {
                                    try {
                                        if (
                                            await prototype.save(
                                                cancelVisit(state, visit.id),
                                            )
                                        )
                                            notice(
                                                'Visit cancelled.',
                                                'Your cancelled visit stays in history. You can book another available period.',
                                            );
                                    } catch (error) {
                                        notice(
                                            'Could not cancel.',
                                            error instanceof Error
                                                ? error.message
                                                : 'Please try again.',
                                        );
                                    }
                                },
                            })
                        }
                        style={{ paddingVertical: 14, alignItems: 'center' }}
                    >
                        <T size={13} color={c.danger}>
                            Cancel this visit
                        </T>
                    </Pressable>
                )}
            </>
        );
    }
    const panelTitle = !panel
        ? ''
        : panel.kind === 'book'
          ? 'Book a visit'
          : panel.kind === 'profile'
            ? 'Contact details'
            : panel.kind === 'guide'
              ? 'Student guide'
              : panel.kind === 'notice'
                ? panel.title
                : panel.kind === 'record'
                  ? 'School-year record'
                  : panel.kind === 'visit'
                    ? 'Your appointment'
                    : 'Clinic update';
    if (!prototype.loading && !prototype.signedIn)
        return <Redirect href="/sign-in" />;
    return (
        <ThemeContext.Provider value={c}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <View
                style={{
                    flex: 1,
                    backgroundColor:
                        Platform.OS === 'web'
                            ? isDark
                                ? '#09110D'
                                : '#E8EDE7'
                            : c.bg,
                    alignItems: 'center',
                }}
            >
                <View
                    style={{
                        width: '100%',
                        maxWidth: 520,
                        flex: 1,
                        backgroundColor: c.bg,
                    }}
                >
                    {!state ? (
                        <View
                            style={{
                                flex: 1,
                                padding: 30,
                                gap: 20,
                                justifyContent: 'center',
                            }}
                        >
                            {prototype.error ? (
                                <>
                                    <T size={24} weight="700">
                                        Let’s get you back in.
                                    </T>
                                    <T color={c.muted}>{prototype.error}</T>
                                    <Button
                                        onPress={() => void prototype.reload()}
                                    >
                                        Try again
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <ActivityIndicator color={c.green} />
                                    <T
                                        color={c.muted}
                                        style={{ textAlign: 'center' }}
                                    >
                                        Opening your student space...
                                    </T>
                                </>
                            )}
                        </View>
                    ) : (
                        <>
                            {header()}
                            <ScrollView
                                key={tab}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{
                                    paddingHorizontal: 24,
                                    paddingTop: 12,
                                    paddingBottom: 25,
                                    gap: 18,
                                }}
                                keyboardShouldPersistTaps="handled"
                            >
                                {prototype.error && (
                                    <Card
                                        style={{ backgroundColor: c.amberSoft }}
                                    >
                                        <T size={12} color={c.danger}>
                                            {prototype.error}
                                        </T>
                                    </Card>
                                )}
                                {tab === 'home'
                                    ? home()
                                    : tab === 'visits'
                                      ? visits()
                                      : tab === 'records'
                                        ? records()
                                        : tab === 'updates'
                                          ? updates()
                                          : profile()}
                            </ScrollView>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    backgroundColor: c.surface,
                                    borderTopWidth: 1,
                                    borderTopColor: c.border,
                                    paddingTop: 10,
                                    paddingBottom: Math.max(insets.bottom, 12),
                                    paddingHorizontal: 10,
                                }}
                            >
                                {TABS.map((item) => (
                                    <Pressable
                                        key={item.key}
                                        accessibilityRole="tab"
                                        accessibilityLabel={item.label}
                                        accessibilityState={{
                                            selected: item.key === tab,
                                        }}
                                        onPress={() => setTab(item.key)}
                                        style={{
                                            flex: 1,
                                            alignItems: 'center',
                                            minHeight: 48,
                                            gap: 4,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 46,
                                                height: 30,
                                                borderRadius: 12,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor:
                                                    tab === item.key
                                                        ? c.greenSoft
                                                        : 'transparent',
                                            }}
                                        >
                                            <Icon
                                                name={
                                                    tab === item.key
                                                        ? item.selected
                                                        : item.icon
                                                }
                                                size={21}
                                                color={
                                                    tab === item.key
                                                        ? c.green
                                                        : c.muted
                                                }
                                            />
                                            {item.key === 'updates' &&
                                                unread > 0 && (
                                                    <View
                                                        style={{
                                                            position:
                                                                'absolute',
                                                            top: 3,
                                                            right: 7,
                                                            width: 6,
                                                            height: 6,
                                                            borderRadius: 3,
                                                            backgroundColor:
                                                                c.amber,
                                                        }}
                                                    />
                                                )}
                                        </View>
                                        <T
                                            size={9}
                                            weight={
                                                tab === item.key ? '600' : '400'
                                            }
                                            color={
                                                tab === item.key
                                                    ? c.green
                                                    : c.muted
                                            }
                                        >
                                            {item.label}
                                        </T>
                                    </Pressable>
                                ))}
                            </View>
                        </>
                    )}
                    {panel && state && (
                        <Sheet
                            title={panelTitle}
                            onClose={() => setPanel(null)}
                            disabled={prototype.busy}
                        >
                            {panelContent()}
                        </Sheet>
                    )}
                </View>
            </View>
        </ThemeContext.Provider>
    );
}
export default function App() {
    return <StudentApp />;
}
