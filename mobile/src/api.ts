import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_NEU_API_URL!;
export const REALTIME_URL = process.env.EXPO_PUBLIC_NEU_REALTIME_URL!;
const KEY = 'neu-health-session-v2';
export const sessionStorage = {
    get: async (): Promise<string | null> =>
        Platform.OS === 'web'
            ? globalThis.sessionStorage.getItem(KEY)
            : SecureStore.getItemAsync(KEY),
    set: async (value: string): Promise<void> => {
        if (Platform.OS === 'web')
            globalThis.sessionStorage.setItem(KEY, value);
        else
            await SecureStore.setItemAsync(KEY, value, {
                keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            });
    },
    clear: async (): Promise<void> => {
        if (Platform.OS === 'web') globalThis.sessionStorage.removeItem(KEY);
        else await SecureStore.deleteItemAsync(KEY);
    },
};
export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
    ) {
        super(message);
    }
}
export async function request<T>(
    path: string,
    options: {
        method?: string;
        body?: unknown;
        credential?: string;
        token?: string;
    } = {},
): Promise<T> {
    if (!API_URL) throw new Error('The clinic connection is not configured.');
    let response: Response;
    try {
        response = await fetch(API_URL.replace(/\/$/, '') + path, {
            method: options.method ?? 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(options.credential
                    ? { 'X-Neu-Session': options.credential }
                    : {}),
                ...(options.token
                    ? { Authorization: 'Bearer ' + options.token }
                    : {}),
            },
            body:
                options.body === undefined
                    ? undefined
                    : JSON.stringify(options.body),
            signal: AbortSignal.timeout(
                path.endsWith('/guide') ? 60000 : 30000,
            ),
        });
    } catch {
        throw new Error(
            'Cannot reach your student space. Check your connection and try again.',
        );
    }
    const data = await response.json();
    if (!response.ok)
        throw new ApiError(
            typeof data.error === 'string'
                ? data.error
                : 'The request could not be completed.',
            response.status,
        );
    return data as T;
}
