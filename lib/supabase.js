'use client';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
export const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
export const sb = createClient(url, key, { realtime: { params: { eventsPerSecond: 20 } } });

// Սխալների հայերեն թարգմանություն
const MAP = {
  'Invalid login credentials': 'Սխալ էլ. փոստ կամ գաղտնաբառ',
  'User already registered': 'Այս էլ. փոստով օգտատեր արդեն կա',
  'Email not confirmed': 'Հաստատեք էլ. փոստը՝ ձեզ ուղարկված նամակով',
  'Password should be at least 6 characters': 'Գաղտնաբառը պետք է լինի առնվազն 6 նիշ',
  'Failed to fetch': 'Կապ չկա սերվերի հետ',
};
export const errText = (e) => {
  const m = (e && (e.message || e.error_description)) || String(e || '');
  for (const k in MAP) if (m.includes(k)) return MAP[k];
  return /[Ա-և]/.test(m) ? m : 'Տեղի ունեցավ սխալ, փորձեք կրկին';
};

// Սերվերի ժամի տարբերություն՝ ժամաչափերի համաժամեցման համար
let offset = 0;
export async function syncClock() {
  const t0 = Date.now();
  const { data } = await sb.rpc('server_now');
  if (data) offset = new Date(data).getTime() - (t0 + Date.now()) / 2;
  return offset;
}
export const serverNow = () => Date.now() + offset;

export async function ensureAnon() {
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user;
  const r = await sb.auth.signInAnonymously();
  if (r.error) throw r.error;
  return r.data.user;
}

export const COLORS = ['bg-a0', 'bg-a1', 'bg-a2', 'bg-a3'];
