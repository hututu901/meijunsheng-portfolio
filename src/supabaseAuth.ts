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
export const requestPasswordReset = async (email: string) => {
  if (!isAuthConfigured) throw new Error('Supabase Auth 未配置');
  const response = await fetch(`${endpoint}/auth/v1/recover`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ email, redirect_to: window.location.origin }) });
  if (!response.ok) throw new Error('重置邮件发送失败');
};
export const updatePassword = async (password: string) => {
  const session = getAuthSession();
  if (!session) throw new Error('重置链接已失效');
  const response = await fetch(`${endpoint}/auth/v1/user`, { method: 'PUT', headers: { ...authHeaders, Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ password }) });
  if (!response.ok) throw new Error('密码更新失败');
};
export const restoreRecoverySession = () => {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken || params.get('type') !== 'recovery') return false;
  window.localStorage.setItem(sessionKey, JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }));
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return true;
};
export const signOut = () => window.localStorage.removeItem(sessionKey);
export const authAccessToken = () => getAuthSession()?.access_token || anonKey;
