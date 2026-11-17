'use client';
import { useState } from 'react';
import { Nav } from '@/components/ui';
import { sb, errText } from '@/lib/supabase';

export default function Login() {
  const [mode, setMode] = useState('in');
  const [f, setF] = useState({ name: '', email: '', pass: '' });
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const next = typeof window !== 'undefined' ? new URLSearchParams(location.search).get('next') || '/dashboard' : '/dashboard';

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    try {
      const { data: s } = await sb.auth.getSession();
      if (s.session?.user?.is_anonymous) await sb.auth.signOut();
      if (mode === 'up') {
        if (!f.name.trim()) throw new Error('Մուտքագրեք ձեր անունը');
        const { data, error } = await sb.auth.signUp({ email: f.email, password: f.pass, options: { data: { name: f.name.trim() } } });
        if (error) throw error;
        if (!data.session) { setMsg('Գրանցումը հաջողվեց։ Հաստատեք էլ. փոստը և մուտք գործեք։'); setMode('in'); return; }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: f.email, password: f.pass });
        if (error) throw error;
      }
      location.href = next;
    } catch (err) { setMsg(errText(err)); } finally { setBusy(false); }
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <><Nav />
      <main className="px-4 py-10 grid place-items-center">
        <form onSubmit={submit} className="card w-full max-w-md animate-rise">
          <h1 className="text-3xl font-black">{mode === 'in' ? 'Մուտք' : 'Գրանցում'}</h1>
          <p className="text-slate-500 mt-1 mb-6">{mode === 'in' ? 'Մուտք գործեք՝ վիկտորինաներ ստեղծելու և խաղեր անցկացնելու համար' : 'Ստեղծեք հաշիվ անվճար'}</p>
          {mode === 'up' && <label className="block mb-4"><span className="label">Անուն</span><input className="input" value={f.name} onChange={set('name')} autoComplete="name" /></label>}
          <label className="block mb-4"><span className="label">Էլ. փոստ</span><input className="input" type="email" required value={f.email} onChange={set('email')} autoComplete="email" /></label>
          <label className="block mb-6"><span className="label">Գաղտնաբառ</span><input className="input" type="password" required minLength={6} value={f.pass} onChange={set('pass')} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></label>
          {msg && <p className="mb-4 font-semibold text-a0">{msg}</p>}
          <button className="btn w-full" disabled={busy}>{busy ? 'Սպասեք…' : mode === 'in' ? 'Մուտք գործել' : 'Գրանցվել'}</button>
          <button type="button" className="mt-4 w-full text-center font-bold text-a1" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(''); }}>
            {mode === 'in' ? 'Հաշիվ չունե՞ք։ Գրանցվեք' : 'Արդեն ունե՞ք հաշիվ։ Մուտք գործեք'}
          </button>
        </form>
      </main>
    </>
  );
}
