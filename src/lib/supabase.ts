import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ktifqnxkpzdnboqgjtsg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const POST_AUTH_REDIRECT_KEY = 'edupulse_post_auth_redirect';

/** Google OAuth từng redirect về /#login rồi gắn thêm #access_token → hash bị gãy. */
function normalizeOAuthHash() {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash || '';
  const tokenAt = hash.indexOf('access_token=');
  if (tokenAt < 0) return;
  sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, '1');
  const query = hash.slice(tokenAt);
  const next = `${window.location.pathname}${window.location.search}#${query}`;
  window.history.replaceState(null, '', next);
}

normalizeOAuthHash();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  }
});

export async function recoverOAuthSessionFromUrl() {
  if (typeof window === 'undefined') return false;
  normalizeOAuthHash();

  const code = new URLSearchParams(window.location.search).get('code');
  if (code) {
    sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, '1');
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    window.history.replaceState(null, '', window.location.pathname);
    if (error) {
      console.warn('Không đổi code OAuth lấy phiên:', error.message);
      return false;
    }
    return true;
  }

  const hash = window.location.hash.replace(/^#/, '');
  if (!hash.includes('access_token=')) return false;
  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return false;
  sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, '1');
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    console.warn('Không khôi phục được phiên OAuth từ URL:', error.message);
    return false;
  }
  window.history.replaceState(null, '', window.location.pathname);
  return true;
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseAnonKey.includes('REPLACE') &&
  supabaseAnonKey.length > 20
);
