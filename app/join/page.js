'use client';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/ui';
import { sb, errText, ensureAnon } from '@/lib/supabase';
import { sfx } from '@/lib/sound';

export default function Join() {
  const [pin, setPin] = useState(''); const [nick, setNick] = useState('');
  const [stage, setStage] = useState('pin'); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(location.search).get('pin');
    if (p) { setPin(p.replace(/\D/g, '').slice(0, 6)); setStage('nick'); }
    try { setNick(localStorage.getItem('kayts-nick') || ''); } catch {}
  }, []);

  async function checkPin(e) {
    e.preventDefault(); setMsg('');
    if (pin.length !== 6) return setMsg('PIN-ը պետք է լինի 6 թիվ');
    setBusy(true);
    const { data } = await sb.from('games').select('id,status').eq('pin', pin).neq('status', 'ended').maybeSingle();
    setBusy(false);
    if (!data) return setMsg('Այդ PIN-ով խաղ չկա');
    setStage('nick');
  }
  async function join(e) {
    e.preventDefault(); setMsg(''); setBusy(true);
    try {
      await ensureAnon();
      const { data, error } = await sb.rpc('join_game', { p_pin: pin, p_nick: nick });
      if (error) throw error;
      try { localStorage.setItem('kayts-nick', nick.trim()); } catch {}
      sfx.join();
      location.href = '/play/' + data.game_id;
    } catch (err) { setMsg(errText(err)); setBusy(false); }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm text-center">
        <Logo className="!text-5xl" />
        <form onSubmit={stage === 'pin' ? checkPin : join} className="card mt-8 !p-5 animate-rise" key={stage}>
          {stage === 'pin' ? (
            <input className="input text-center text-3xl font-black tracking-[.3em] !min-h-[64px]" inputMode="numeric" autoFocus placeholder="PIN" aria-label="Խաղի PIN" maxLength={6}
              value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
          ) : (
            <>
              <p className="text-slate-500 font-bold mb-2">PIN {pin}</p>
              <input className="input text-center text-2xl font-black !min-h-[64px]" autoFocus placeholder="Մականուն" aria-label="Մականուն" maxLength={16}
                value={nick} onChange={(e) => setNick(e.target.value)} />
            </>
          )}
          {msg && <p className="mt-3 font-bold text-a0">{msg}</p>}
          <button className="btn w-full mt-4 text-xl !min-h-[56px]" disabled={busy}>{busy ? 'Սպասեք…' : stage === 'pin' ? 'Մուտք' : 'Միանալ'}</button>
          {stage === 'nick' && <button type="button" className="mt-3 text-slate-500 font-bold" onClick={() => setStage('pin')}>Փոխել PIN-ը</button>}
        </form>
        <p className="text-white/60 mt-6 text-sm">Գրանցում պետք չէ</p>
      </div>
    </main>
  );
}
