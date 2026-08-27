const endpoint = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const sessionKey = 'meijunsheng-supabase-session';

export const isAuthConfigured = Boolean(endpoint && anonKey);
const authHeaders = { apikey: anonKey, 'Content-Type': 'application/json' };

export type AuthSession = { access_token: string; refresh_token: string; user?: { email?: string } };
export const getAuthSession = (): AuthSession | null => {
  try { return JSON.parse(window.localStorage.getItem(sessionKey) || 'null') as AuthSession | null; } catch { return null; }
};
export const signIn = async (email: string, password: string) => {
  if (!isAuthConfigured) throw new Error('Supabase Auth 未配置');
  const response = await fetch(`${endpoint}/auth/v1/token?grant_type=password`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error('登录失败');
  const session = await response.json() as AuthSession;
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
  return session;
};
export const signOut = () => window.localStorage.removeItem(sessionKey);
export const authAccessToken = () => getAuthSession()?.access_token || anonKey;
