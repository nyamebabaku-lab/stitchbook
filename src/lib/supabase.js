import { createClient } from '@supabase/supabase-js';
import { SCHEMA } from '../config';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key
  ? createClient(url, key, { db: { schema: SCHEMA }, auth: { storageKey: 'stitchbook-auth', persistSession: true, autoRefreshToken: true } })
  : null;

/** True when the error is "no internet" rather than a real refusal. */
export const isNetwork = (e) => /Failed to fetch|NetworkError|network|Load failed|timeout/i.test(e?.message || String(e || ''));

export function friendly(e) {
  const m = e?.message || String(e || 'Something went wrong');
  if (/Invalid login credentials/i.test(m)) return 'Wrong phone number or password.';
  if (/already registered|already been registered/i.test(m)) return 'This phone number already has an account — sign in instead.';
  if (isNetwork(e)) return 'No internet connection. Please try again.';
  if (/JWT|token/i.test(m)) return 'Your session expired. Please sign in again.';
  if (/row-level security|permission denied/i.test(m)) return 'You are not allowed to do that.';
  if (/Password should be/i.test(m)) return 'Password must be at least 6 characters.';
  return m.replace(/^.*?ERROR:\s*/, '');
}
