'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { sb, configured } from '@/lib/supabase';
import { isMuted, setMuted } from '@/lib/sound';

export const SHAPES = [
  <polygon key="0" points="15,3 28,27 2,27" fill="#fff" />,
  <polygon key="1" points="15,2 28,15 15,28 2,15" fill="#fff" />,
  <circle key="2" cx="15" cy="15" r="13" fill="#fff" />,
  <rect key="3" x="3" y="3" width="24" height="24" rx="3" fill="#fff" />,
];
export const Shape = ({ i, className = 'w-8 h-8' }) => <svg viewBox="0 0 30 30" className={className + ' flex-none'}>{SHAPES[i]}</svg>;

export function useUser() {
  const [user, setUser] = useState(undefined);
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => data.subscription.unsubscribe();
  }, []);
  return user;
}
export const isReal = (u) => u && !u.is_anonymous;

export function Logo({ className = '' }) {
  return <Link href="/" className={'font-black text-2xl tracking-tight text-white ' + className}>Կայծ<span className="text-coral">!</span></Link>;
}

export function MuteButton() {
  const [m, setM] = useState(false);
  useEffect(() => setM(isMuted()), []);
  return (
    <button aria-label={m ? 'Միացնել ձայնը' : 'Անջատել ձայնը'} title={m ? 'Միացնել ձայնը' : 'Անջատել ձայնը'}
      onClick={() => { setMuted(!m); setM(!m); }} className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-xl grid place-items-center">
      {m ? '🔇' : '🔊'}
    </button>
  );
}

export function Nav() {
  const user = useUser();
  return (
    <header className="flex items-center justify-between gap-3 px-[max(4vw,16px)] py-4 flex-wrap">
      <Logo />
      <nav className="flex items-center gap-2 flex-wrap">
        <Link href="/join" className="btn-ghost">Միանալ խաղին</Link>
        {isReal(user) ? (
          <>
            <Link href="/dashboard" className="btn-ghost">Վահանակ</Link>
            <button className="btn-ghost" onClick={async () => { await sb.auth.signOut(); location.href = '/'; }}>Ելք</button>
          </>
        ) : user !== undefined && <Link href="/login" className="btn">Մուտք</Link>}
      </nav>
    </header>
  );
}

export function SetupWarning() {
  if (configured) return null;
  return (
    <div className="mx-4 my-3 rounded-xl bg-a2 text-black p-3 text-sm font-semibold">
      Supabase-ը դեռ միացված չէ։ Ստեղծեք <code>.env.local</code> ֆայլ (տե՛ս README.md)։
    </div>
  );
}

export function Spinner({ text = 'Բեռնվում է…' }) {
  return <div className="min-h-[50vh] grid place-items-center text-white/80 font-bold"><div className="flex items-center gap-3"><span className="w-6 h-6 border-4 border-white/30 border-t-coral rounded-full animate-spin" />{text}</div></div>;
}

export function Confetti() {
  const cols = ['#e5384f', '#2f6fe0', '#e8a317', '#1f9d55', '#ff6b4a', '#fff'];
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden motion-reduce:hidden" aria-hidden>
      {Array.from({ length: 60 }, (_, i) => (
        <span key={i} className="absolute top-0 w-2.5 h-4 rounded-sm animate-fall"
          style={{ left: (i * 37) % 100 + '%', background: cols[i % 6], animationDelay: (i % 12) * 0.25 + 's', animationDuration: 2.5 + (i % 5) * 0.4 + 's' }} />
      ))}
    </div>
  );
}

export function Podium({ players }) {
  const top = [...players].sort((a, b) => b.score - a.score).slice(0, 3);
  const order = [1, 0, 2], h = ['h-44', 'h-32', 'h-24'], c = ['bg-a2', 'bg-slate-300', 'bg-orange-400'];
  return (
    <div className="flex items-end justify-center gap-3 mt-6">
      {order.filter((i) => top[i]).map((i) => (
        <div key={i} className="w-[30%] max-w-[170px] text-center animate-rise" style={{ animationDelay: (2 - i) * 0.4 + 's', animationFillMode: 'both' }}>
          <div className="font-black text-white text-lg truncate">{top[i].nickname}</div>
          <div className="text-white/80 font-bold">{top[i].score}</div>
          <div className={`${h[i]} ${c[i]} rounded-t-2xl mt-2 grid place-items-start justify-center pt-3 text-4xl font-black text-white shadow-[0_8px_0_rgba(0,0,0,.2)]`}>{i + 1}</div>
        </div>
      ))}
    </div>
  );
}

export function Leaderboard({ players, highlight }) {
  const s = [...players].sort((a, b) => b.score - a.score);
  return (
    <ol className="space-y-2">
      {s.slice(0, 8).map((p, i) => (
        <li key={p.id} className={`flex justify-between gap-3 px-4 py-3 rounded-xl font-bold animate-rise ${p.id === highlight ? 'bg-coral text-white' : 'bg-white text-ink'}`} style={{ animationDelay: i * 0.06 + 's', animationFillMode: 'both' }}>
          <span className="truncate">{i + 1}. {p.nickname}</span><span className="tabular-nums">{p.score}</span>
        </li>
      ))}
    </ol>
  );
}

export function TimerBar({ left, total }) {
  return <div className="h-3 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-coral transition-[width] duration-200 ease-linear" style={{ width: Math.max(0, (left / total) * 100) + '%' }} /></div>;
}
