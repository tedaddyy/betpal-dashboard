// Tiny fetch wrapper for the Mission Control API. The token lives in
// localStorage; requests go to same-origin /api/dashboard/* which Next rewrites
// to the BetPal backend (see next.config.js).

const BASE = '/api/dashboard';
const TOKEN_KEY = 'betpal_mc_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) { window.localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { window.localStorage.removeItem(TOKEN_KEY); }

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as any) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  let data: any = null;
  const text = await res.text();
  if (text) { try { data = JSON.parse(text); } catch { data = { error: text }; } }
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth')) {
      clearToken();
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
    }
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

export const apiGet = <T = any>(p: string) => api<T>(p);
export const apiPost = <T = any>(p: string, body?: any) => api<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
export const apiPatch = <T = any>(p: string, body?: any) => api<T>(p, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
export const apiPut = <T = any>(p: string, body?: any) => api<T>(p, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
export const apiDelete = <T = any>(p: string) => api<T>(p, { method: 'DELETE' });
