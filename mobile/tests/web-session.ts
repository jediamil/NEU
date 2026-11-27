export class WebSession {
    private cookies = new Map<string, string>();
    private version: string | undefined;
    private base: string;
    constructor(base = process.env.NEU_WEB_URL ?? 'http://127.0.0.1:8000') {
        this.base = base;
    }
    async request(
        path: string,
        body?: unknown,
        method = body === undefined ? 'GET' : 'POST',
    ): Promise<{ status: number; data: ReturnType<typeof JSON.parse> }> {
        const token = this.cookies.get('XSRF-TOKEN');
        const response = await fetch(this.base + path, {
            method,
            redirect: 'manual',
            signal: AbortSignal.timeout(60000),
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(method === 'GET' && this.version
                    ? { 'X-Inertia': 'true', 'X-Inertia-Version': this.version }
                    : {}),
                ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}),
                Cookie: [...this.cookies]
                    .map(([key, value]) => `${key}=${value}`)
                    .join('; '),
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        for (const cookie of response.headers.getSetCookie()) {
            const pair = cookie.split(';')[0];
            const separator = pair.indexOf('=');
            this.cookies.set(
                pair.slice(0, separator),
                pair.slice(separator + 1),
            );
        }
        const content = await response.text();
        const page = content.match(
            /<script data-page="app" type="application\/json">([\s\S]*?)<\/script>/,
        )?.[1];
        const data = response.headers.get('content-type')?.includes('json')
            ? JSON.parse(content)
            : page
              ? JSON.parse(page)
              : null;
        if (data?.version) this.version = data.version;
        if (response.status === 409 && method === 'GET' && this.version) {
            this.version = undefined;
            return this.request(path);
        }
        return { status: response.status, data };
    }
    async login() {
        await this.request('/login');
        return this.request('/login', {
            email: process.env.NEU_WEB_EMAIL,
            password: process.env.NEU_WEB_PASSWORD,
        });
    }
}
