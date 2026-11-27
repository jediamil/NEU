import { createAuthServer, serializeSetCookie } from '@neon/auth/server';

/** Each request gets a separate SDK instance and cookie jar; never share user sessions. */
export function managedAuth(credential = '') {
    let cookie = credential;
    const origin =
        'https://br-quiet-frog-bd0ipaom-studentapi.compute.c-8.us-east-2.aws.neon.tech';
    const auth = createAuthServer({
        baseUrl: process.env.NEON_AUTH_BASE_URL!,
        cookieSecret: process.env.NEU_AUTH_COOKIE_SECRET!,
        context: () => ({
            getCookies: () => cookie,
            setCookie: (name, value, options) => {
                if (name.endsWith('session_token'))
                    cookie = serializeSetCookie({
                        name,
                        value,
                        ...options,
                    }).split(';')[0];
            },
            getHeader: (name) =>
                name.toLowerCase() === 'origin' ? origin : null,
            getOrigin: () => origin,
            getFramework: () => 'hono',
        }),
    }) as ReturnType<typeof createAuthServer> & {
        token(): Promise<{
            data: { token: string } | null;
            error: { message?: string } | null;
        }>;
    };
    return { auth, credential: () => cookie };
}
