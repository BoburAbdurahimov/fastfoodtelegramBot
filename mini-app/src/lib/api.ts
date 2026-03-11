const TG_INIT_DATA = window.Telegram?.WebApp?.initData || '';

// In production (Vercel), API is at /api/app. In dev, Vite proxy forwards /api to localhost:3001
const API_BASE = import.meta.env.PROD ? '/api/app' : '/api';

interface FetchOptions extends RequestInit {
    body?: any;
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const { body, ...rest } = options;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': TG_INIT_DATA,
    };

    // Dev fallback
    if (!TG_INIT_DATA && import.meta.env.DEV) {
        const devId = import.meta.env.VITE_DEV_TELEGRAM_ID;
        if (devId) {
            headers['X-Dev-Telegram-Id'] = devId;
        }
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...rest,
        headers: { ...headers, ...rest.headers as any },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
}

export const api = {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: any) => request<T>(path, { method: 'POST', body }),
    put: <T>(path: string, body?: any) => request<T>(path, { method: 'PUT', body }),
    del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
