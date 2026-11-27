import { router, usePage } from '@inertiajs/react';
import { createRealtimeClient } from '@neon/realtime/client';
import type { SealedLiveQuery } from '@neon/realtime/client';
import { useEffect, useRef, useState } from 'react';
import { dashboard } from '@/routes';
import { subscription as subscriptionRoute } from '@/routes/realtime';

type Revision = { id: string; revision: string };
export type PortalLiveStatus =
    | 'Live'
    | 'Connecting'
    | 'Reconnecting'
    | 'Updates paused'
    | 'Offline'
    | null;
const topics: Record<string, string[]> = {
    dashboard: [
        'students',
        'appointments',
        'clearances',
        'schedules',
        'announcements',
    ],
    appointments: ['students', 'appointments', 'schedules'],
    'scheduled-students': ['students', 'appointments', 'schedules'],
    students: ['students', 'clearances', 'appointments'],
    clearances: ['students', 'clearances'],
    schedules: ['appointments', 'schedules'],
    announcements: ['announcements'],
};

export function usePortalRealtime(): PortalLiveStatus {
    const { auth, realtime } = usePage().props;
    const page = usePage().url;
    const currentPage = useRef(page);
    const [status, setStatus] = useState<PortalLiveStatus>(
        realtime?.url ? 'Connecting' : null,
    );
    useEffect(() => {
        currentPage.current = page;
    }, [page]);
    const userId = auth.user?.id;
    const role = auth.user?.role;
    const url = realtime?.url;

    useEffect(() => {
        if (!url || !userId || !role) return;
        let disposed = false;
        let halted = false;
        let client: ReturnType<typeof createRealtimeClient> | undefined;
        let unsubscribe: (() => void) | undefined;
        let refreshTimer = 0;
        let retryTimer = 0;
        let renewalTimer = 0;
        let visits = 0;
        let pending = false;
        let retryDelay = 1000;
        let previous = new Map<string, string>();
        let generation = 0;
        const abort = new AbortController();

        function flush() {
            if (disposed || halted || !pending || visits > 0 || document.hidden)
                return;
            pending = false;
            router.reload({
                except: ['flash'],
                showProgress: false,
            });
        }
        function refresh() {
            pending = true;
            window.clearTimeout(refreshTimer);
            refreshTimer = window.setTimeout(flush, 300);
        }
        const stopStart = router.on('start', () => {
            visits++;
        });
        const stopFinish = router.on('finish', () => {
            visits = Math.max(0, visits - 1);
            if (pending) refresh();
        });
        async function sealed(): Promise<SealedLiveQuery<Revision>> {
            const xsrf = document.cookie
                .split('; ')
                .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
                ?.slice(11);
            const response = await fetch(subscriptionRoute.url(), {
                method: 'POST',
                credentials: 'same-origin',
                signal: abort.signal,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(xsrf
                        ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) }
                        : {}),
                },
                body: JSON.stringify({ user_id: userId, role }),
            });
            if ([401, 403, 409, 419].includes(response.status)) {
                halted = true;
                unsubscribe?.();
                client?.close();
                setStatus('Updates paused');
                window.location.assign(dashboard.url());
                throw new Error('Staff session changed');
            }
            if (!response.ok) throw new Error('Live updates unavailable');
            return response.json() as Promise<SealedLiveQuery<Revision>>;
        }
        function close() {
            generation++;
            window.clearTimeout(renewalTimer);
            unsubscribe?.();
            unsubscribe = undefined;
            client?.close();
            client = undefined;
        }
        function recover() {
            if (disposed || halted) return;
            close();
            setStatus(navigator.onLine ? 'Reconnecting' : 'Offline');
            window.clearTimeout(retryTimer);
            retryTimer = window.setTimeout(() => {
                void connect();
            }, retryDelay);
            retryDelay = Math.min(30000, retryDelay * 2);
        }
        async function connect() {
            if (disposed || halted) return;
            close();
            const current = generation;
            try {
                const query = await sealed();
                if (disposed || halted || current !== generation) return;
                client = createRealtimeClient({ url: url! });
                const live = client.subscribe(query);
                unsubscribe = () => live.unsubscribe();
                let first = true;
                live.onChange((snapshot) => {
                    if (
                        disposed ||
                        halted ||
                        current !== generation ||
                        snapshot.status !== 'live' ||
                        !snapshot.data
                    )
                        return;
                    setStatus('Live');
                    retryDelay = 1000;
                    if (snapshot.data.length === 0) {
                        halted = true;
                        close();
                        window.location.assign(dashboard.url());
                        return;
                    }
                    const section = currentPage.current
                        .split('?')[0]
                        .split('/')[1];
                    const relevant = topics[section] ?? [];
                    if (
                        relevant.length &&
                        (first ||
                            snapshot.data.some(
                                (row) =>
                                    relevant.includes(row.id) &&
                                    previous.get(row.id) !==
                                        String(row.revision),
                            ))
                    )
                        refresh();
                    previous = new Map(
                        snapshot.data.map((row) => [
                            row.id,
                            String(row.revision),
                        ]),
                    );
                    first = false;
                });
                live.onStateChange((state) => {
                    if (disposed || halted || current !== generation) return;
                    if (state.status === 'error') recover();
                    else if (state.status !== 'closed')
                        setStatus(
                            state.status === 'live' ? 'Live' : 'Reconnecting',
                        );
                });
                async function renew() {
                    try {
                        const next = await sealed();
                        if (disposed || halted || current !== generation)
                            return;
                        await live.renew(next);
                        renewalTimer = window.setTimeout(
                            () => {
                                void renew();
                            },
                            Math.max(1000, next.expiresAt - Date.now() - 10000),
                        );
                    } catch {
                        if (current === generation) recover();
                    }
                }
                renewalTimer = window.setTimeout(
                    () => {
                        void renew();
                    },
                    Math.max(1000, query.expiresAt - Date.now() - 10000),
                );
            } catch {
                if (current === generation) recover();
            }
        }
        function visible() {
            if (!document.hidden) flush();
        }
        function online() {
            window.clearTimeout(retryTimer);
            void connect();
        }
        function offline() {
            setStatus('Offline');
        }
        document.addEventListener('visibilitychange', visible);
        window.addEventListener('online', online);
        window.addEventListener('offline', offline);
        void connect();
        return () => {
            disposed = true;
            abort.abort();
            close();
            window.clearTimeout(refreshTimer);
            window.clearTimeout(retryTimer);
            stopStart();
            stopFinish();
            document.removeEventListener('visibilitychange', visible);
            window.removeEventListener('online', online);
            window.removeEventListener('offline', offline);
        };
    }, [url, userId, role]);
    return status;
}
