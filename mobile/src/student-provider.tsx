import {
    createContext,
    useContext,
    useState,
    useEffect,
    useRef,
    useCallback,
} from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import { createRealtimeClient } from '@neon/realtime/client';
import type { SealedLiveQuery } from '@neon/realtime/client';
import { ApiError, request, sessionStorage, REALTIME_URL } from './api';
import type { PrototypeState } from './domain';

function useStudentStore() {
    const [state, setState] = useState<PrototypeState | null>(null);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [signedIn, setSignedIn] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [liveStatus, setLiveStatus] = useState('Connecting');
    const session = useRef({ credential: '', token: '', expires: 0 });
    const saving = useRef(false);
    const generation = useRef(0);
    const refreshPromise = useRef<Promise<void> | null>(null);
    const clear = useCallback(async () => {
        generation.current++;
        session.current = { credential: '', token: '', expires: 0 };
        setSignedIn(false);
        setState(null);
        await sessionStorage.clear();
    }, []);
    const refresh = useCallback(async () => {
        if (refreshPromise.current) return refreshPromise.current;
        const captured = generation.current;
        refreshPromise.current = (async () => {
            const result = await request<{ token: string }>('/auth/refresh', {
                method: 'POST',
                credential: session.current.credential,
            });
            if (captured === generation.current)
                session.current = {
                    ...session.current,
                    token: result.token,
                    expires: Date.now() + 10 * 60000,
                };
        })().finally(() => {
            refreshPromise.current = null;
        });
        return refreshPromise.current;
    }, []);
    const api = useCallback(
        async <T,>(
            path: string,
            method = 'GET',
            body?: unknown,
        ): Promise<T> => {
            try {
                if (session.current.expires < Date.now()) await refresh();
                return await request<T>(path, {
                    method,
                    body,
                    credential: session.current.credential,
                    token: session.current.token,
                });
            } catch (caught) {
                if (caught instanceof ApiError && caught.status === 401) {
                    await clear();
                    setError('Your session has ended. Please sign in again.');
                }
                throw caught;
            }
        },
        [clear, refresh],
    );
    const reload = useCallback(async () => {
        if (!session.current.credential) return;
        const captured = generation.current;
        try {
            const next = await api<PrototypeState>('/api/v1/state');
            if (captured === generation.current) {
                setState(next);
                setError(null);
            }
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : 'Could not refresh your student space.',
            );
        }
    }, [api]);
    useEffect(() => {
        void (async () => {
            try {
                const credential = await sessionStorage.get();
                if (credential) {
                    session.current.credential = credential;
                    await refresh();
                    setSignedIn(true);
                    await reload();
                }
            } catch (caught) {
                if (caught instanceof ApiError && caught.status === 401)
                    await clear();
                else
                    setError(
                        caught instanceof Error
                            ? caught.message
                            : 'Could not restore your session.',
                    );
            } finally {
                setLoading(false);
            }
        })();
    }, [clear, refresh, reload]);
    useEffect(() => {
        if (!signedIn) return;
        const listener = AppState.addEventListener('change', (status) => {
            if (status === 'active') void reload();
        });
        return () => listener.remove();
    }, [signedIn, reload]);
    useEffect(() => {
        if (!signedIn || !REALTIME_URL) return;
        const client = createRealtimeClient({ url: REALTIME_URL });
        let cancelled = false;
        let renewal: ReturnType<typeof setTimeout> | undefined;
        let recovery: ReturnType<typeof setTimeout> | undefined;
        let stopSubscription: (() => void) | undefined;
        async function connect() {
            try {
                const sealed = await api<
                    SealedLiveQuery<{ id: string; revision: string }>
                >('/api/v1/live', 'POST');
                if (cancelled) return;
                const subscription = client.subscribe(sealed);
                stopSubscription = () => subscription.unsubscribe();
                subscription.onChange((snapshot) => {
                    if (cancelled) return;
                    setLiveStatus(
                        snapshot.status === 'live'
                            ? 'Live sync'
                            : snapshot.status === 'error'
                              ? 'Sync interrupted'
                              : 'Reconnecting',
                    );
                    if (snapshot.status === 'live') void reload();
                });
                subscription.onStateChange((snapshot) => {
                    if (snapshot.status === 'error' && !cancelled) {
                        setLiveStatus('Sync interrupted');
                        stopSubscription?.();
                        recovery = setTimeout(() => void connect(), 5000);
                    }
                });
                const renew = async () => {
                    if (cancelled) return;
                    try {
                        const next = await api<
                            SealedLiveQuery<{ id: string; revision: string }>
                        >('/api/v1/live', 'POST');
                        if (cancelled) return;
                        await subscription.renew(next);
                        renewal = setTimeout(
                            () => void renew(),
                            Math.max(1000, next.expiresAt - Date.now() - 10000),
                        );
                    } catch {
                        if (!cancelled) {
                            setLiveStatus('Sync interrupted');
                            renewal = setTimeout(() => void renew(), 5000);
                        }
                    }
                };
                renewal = setTimeout(
                    () => void renew(),
                    Math.max(1000, sealed.expiresAt - Date.now() - 10000),
                );
            } catch {
                if (!cancelled) {
                    setLiveStatus('Sync interrupted');
                    recovery = setTimeout(() => void connect(), 5000);
                }
            }
        }
        void connect();
        return () => {
            cancelled = true;
            clearTimeout(renewal);
            clearTimeout(recovery);
            stopSubscription?.();
            client.close();
        };
    }, [signedIn, api, reload]);
    async function signIn(
        input: { email: string; password: string; name?: string },
        register: boolean,
    ) {
        if (saving.current) return false;
        saving.current = true;
        setBusy(true);
        setError(null);
        try {
            const result = await request<{ credential: string; token: string }>(
                '/auth/' + (register ? 'sign-up' : 'sign-in'),
                { method: 'POST', body: input },
            );
            await sessionStorage.set(result.credential);
            generation.current++;
            session.current = {
                credential: result.credential,
                token: result.token,
                expires: Date.now() + 10 * 60000,
            };
            setSignedIn(true);
            await reload();
            return true;
        } catch (caught) {
            setError(
                caught instanceof Error ? caught.message : 'Sign-in failed.',
            );
            return false;
        } finally {
            saving.current = false;
            setBusy(false);
        }
    }
    async function signOut() {
        if (saving.current) return;
        saving.current = true;
        setBusy(true);
        try {
            await request('/auth/sign-out', {
                method: 'POST',
                credential: session.current.credential,
            });
            await clear();
            setError(null);
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : 'Could not sign out.',
            );
        } finally {
            saving.current = false;
            setBusy(false);
        }
    }
    async function save(next: PrototypeState): Promise<PrototypeState | false> {
        if (saving.current || !state) return false;
        saving.current = true;
        setBusy(true);
        setError(null);
        try {
            const added = next.visits.find(
                (visit) =>
                    !state.visits.some((existing) => existing.id === visit.id),
            );
            const cancelled = next.visits.find(
                (visit) =>
                    visit.status === 'cancelled' &&
                    state.visits.some(
                        (existing) =>
                            existing.id === visit.id &&
                            existing.status === 'scheduled',
                    ),
            );
            if (added)
                await api('/api/v1/visits', 'POST', {
                    date: added.date,
                    period: added.period,
                    ...(added.services &&
                    (added.services.length > 1 ||
                        added.service === 'medical_clearance_submission')
                        ? { services: added.services }
                        : { service: added.service }),
                    notes: added.notes,
                });
            else if (cancelled)
                await api('/api/v1/visits/' + cancelled.id + '/cancel', 'POST');
            else if (
                next.profile.phone !== state.profile.phone ||
                next.theme !== state.theme
            )
                await api('/api/v1/profile', 'PATCH', {
                    phone: next.profile.phone,
                    theme: next.theme,
                });
            else
                for (const id of next.readAnnouncements.filter(
                    (id) => !state.readAnnouncements.includes(id),
                ))
                    await api(
                        '/api/v1/announcements/' +
                            encodeURIComponent(id) +
                            '/read',
                        'POST',
                    );
            const fresh = await api<PrototypeState>('/api/v1/state');
            setState(fresh);
            return fresh;
        } catch (caught) {
            await reload();
            setError(
                caught instanceof Error
                    ? caught.message
                    : 'Could not save your changes.',
            );
            return false;
        } finally {
            saving.current = false;
            setBusy(false);
        }
    }
    async function ask(question: string): Promise<string> {
        const result = await api<{ answer: string }>('/api/v1/guide', 'POST', {
            question,
        });
        return result.answer;
    }
    return {
        state,
        busy,
        loading,
        signedIn,
        error,
        liveStatus,
        save,
        reload,
        signIn,
        signOut,
        ask,
    };
}
type Store = ReturnType<typeof useStudentStore>;
const StudentContext = createContext<Store | null>(null);
export function StudentProvider({ children }: { children: ReactNode }) {
    const store = useStudentStore();
    return (
        <StudentContext.Provider value={store}>
            {children}
        </StudentContext.Provider>
    );
}
export function useStudent() {
    const store = useContext(StudentContext);
    if (!store) throw new Error('StudentProvider is required.');
    return store;
}
