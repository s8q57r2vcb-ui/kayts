'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo, MuteButton, Spinner, Shape, TimerBar, Confetti, Podium } from '@/components/ui';
import { sb, errText, syncClock, serverNow, COLORS } from '@/lib/supabase';
import { sfx } from '@/lib/sound';

export default function Play({ params }) {
  const gid = params.id;
  const [g, setG] = useState(null);
  const [me, setMe] = useState(null);
  const [pick, setPick] = useState(null);
  const [res, setRes] = useState(null);
  const [left, setLeft] = useState(0);
  const [all, setAll] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    let pres, ch;
    (async () => {
      const { data: s } = await sb.auth.getSession();
      const uid = s.session?.user?.id;
      if (!uid) return setErr('Միացեք խաղին PIN-ով');
      syncClock();
      const [gr, pr] = await Promise.all([
        sb.from('games').select('*').eq('id', gid).single(),
        sb.from('players').select('*').eq('game_id', gid).eq('user_id', uid).maybeSingle(),
      ]);
      if (gr.error || !pr.data) return setErr('Դուք այս խաղի մասնակից չեք');
      setG(gr.data); setMe(pr.data);
      if (gr.data.status === 'question') {
        const { data: a } = await sb.from('answers').select('*').eq('player_id', pr.data.id).eq('q', gr.data.current).maybeSingle();
        if (a) { setPick(a.choice); setRes(a); }
      }
      ch = sb.channel('play-' + gid)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: 'id=eq.' + gid }, (p) => setG(p.new))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: 'id=eq.' + pr.data.id }, (p) => setMe(p.new))
        .subscribe();
      pres = sb.channel('game-' + gid, { config: { presence: { key: pr.data.id } } });
      pres.subscribe((st) => { if (st === 'SUBSCRIBED') pres.track({ pid: pr.data.id }); });
    })();
    return () => { ch && sb.removeChannel(ch); pres && sb.removeChannel(pres); };
  }, []);

  // Փուլի փոփոխություն
  useEffect(() => {
    if (!g || !me) return;
    if (g.status === 'question') { setPick((p) => (res && res.q === g.current ? p : null)); if (!res || res.q !== g.current) setRes(null); }
    if (g.status === 'reveal') {
      sb.from('answers').select('*').eq('player_id', me.id).eq('q', g.current).maybeSingle().then(({ data }) => {
        setRes(data || { q: g.current, missed: true });
        data?.correct ? sfx.correct() : sfx.wrong();
      });
    }
    if (g.status === 'leaderboard' || g.status === 'ended') sb.from('players').select('id,nickname,score').eq('game_id', gid).eq('kicked', false).then(({ data }) => setAll(data || []));
    if (g.status === 'ended') sfx.win();
  }, [g?.status, g?.current]);

  useEffect(() => {
    if (g?.status !== 'question') return;
    const q = g.questions[g.current], total = q.time * 1000, start = new Date(g.started_at).getTime();
    const t = setInterval(() => setLeft(Math.max(0, total - (serverNow() - start))), 200);
    return () => clearInterval(t);
  }, [g?.status, g?.current]);

  async function answer(j) {
    if (pick !== null || left <= 0) return;
    setPick(j); sfx.tap();
    const { data, error } = await sb.rpc('submit_answer', { p_game: gid, p_q: g.current, p_choice: j });
    if (error) { setErr(errText(error)); setTimeout(() => setErr(''), 2500); if (!/արդեն/.test(errText(error))) setPick(null); }
    else setRes(data);
  }

  if (err && !g) return <main className="min-h-screen grid place-items-center p-4"><div className="card text-center max-w-sm"><p className="font-bold">{err}</p><Link href="/join" className="btn mt-4">Միանալ խաղին</Link></div></main>;
  if (!g || !me) return <Spinner text="Միանում ենք…" />;
  if (me.kicked) return <main className="min-h-screen grid place-items-center p-4"><div className="card text-center max-w-sm"><h1 className="text-2xl font-black">Հաղորդավարը ձեզ հեռացրել է խաղից</h1><Link href="/join" className="btn mt-4">Միանալ այլ խաղի</Link></div></main>;

  const q = g.questions[g.current];
  const rank = [...all].sort((a, b) => b.score - a.score).findIndex((p) => p.id === me.id) + 1;
  const Bar = () => (
    <header className="flex items-center justify-between px-4 py-3 bg-black/20">
      <span className="font-black truncate">{me.nickname}</span>
      <div className="flex items-center gap-2"><span className="px-3 py-2 rounded-xl bg-white text-ink font-black tabular-nums">{me.score}</span><MuteButton /></div>
    </header>
  );
  const Center = ({ children }) => <main className="min-h-[80vh] grid place-items-center p-4 text-center">{children}</main>;

  return (
    <div className="min-h-screen">
      <Bar />
      {err && <div className="m-3 rounded-xl bg-a0 p-3 font-bold text-center">{err}</div>}
      {g.status === 'lobby' && <Center><div className="animate-rise"><Logo className="!text-4xl" /><h1 className="text-3xl font-black mt-6">Դուք խաղում եք</h1><p className="text-white/70 mt-2 text-lg">Ձեր անունը երևում է էկրանին։ Սպասեք, մինչև հաղորդավարը սկսի։</p>
        <div className="mt-8 w-10 h-10 border-4 border-white/30 border-t-coral rounded-full animate-spin mx-auto" /></div></Center>}

      {g.status === 'question' && (pick === null ? (
        <main className="p-3 flex flex-col min-h-[calc(100vh-64px)]" key={g.current}>
          <div className="flex justify-between font-bold text-white/80 mb-2"><span>{g.current + 1} / {g.questions.length}</span><span className="tabular-nums">{Math.ceil(left / 1000)} վրկ</span></div>
          <TimerBar left={left} total={q.time * 1000} />
          <div className="card !p-4 text-center text-xl font-black mt-3 animate-rise">{q.text}</div>
          {q.image && <img src={q.image} alt="" className="max-h-40 mx-auto rounded-xl mt-3" />}
          <div className={`grid gap-3 mt-3 flex-1 ${q.options.length > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {q.options.map((o, j) => (
              <button key={j} onClick={() => answer(j)} disabled={left <= 0} className={`${COLORS[j]} rounded-2xl p-4 min-h-[110px] flex flex-col items-center justify-center gap-2 font-black text-lg shadow-[0_6px_0_rgba(0,0,0,.25)] active:translate-y-1 animate-pop`} style={{ animationDelay: j * 0.06 + 's', animationFillMode: 'both' }}>
                <Shape i={j} className="w-10 h-10" /><span className="leading-tight">{o}</span>
              </button>
            ))}
          </div>
        </main>
      ) : <Center><div className="animate-pop"><div className={`${COLORS[pick]} w-28 h-28 rounded-3xl grid place-items-center mx-auto`}><Shape i={pick} className="w-14 h-14" /></div>
        <h1 className="text-3xl font-black mt-6">Պատասխանն ընդունված է</h1><p className="text-white/70 mt-2">Սպասեք մյուսներին…</p></div></Center>)}

      {g.status === 'reveal' && res && <main className={`min-h-[calc(100vh-64px)] grid place-items-center p-4 text-center ${res.missed ? 'bg-slate-600' : res.correct ? 'bg-a3' : 'bg-a0'}`}>
        <div className="animate-pop"><div className="text-7xl font-black">{res.missed ? '⏱' : res.correct ? '✓' : '✕'}</div>
          <h1 className="text-4xl font-black mt-4">{res.missed ? 'Ժամանակը սպառվեց' : res.correct ? 'Ճիշտ է' : 'Սխալ է'}</h1>
          {res.correct && <p className="text-2xl font-black mt-3 bg-black/20 rounded-xl px-5 py-2 inline-block">+{res.points}</p>}
          <p className="mt-5 text-lg">Ճիշտ պատասխանը՝ <b>{q.options[g.revealed]}</b></p>
          {me.streak > 1 && <p className="mt-2 font-bold">Ճիշտ պատասխանների շարք՝ {me.streak} 🔥</p>}</div>
      </main>}

      {g.status === 'leaderboard' && <Center><div className="animate-rise"><p className="text-white/70 font-bold text-lg">Դուք</p>
        <div className="text-7xl font-black">{rank || '—'}<span className="text-3xl">-րդն եք</span></div>
        <p className="text-xl mt-3 font-bold">{me.score} միավոր · {all.length} մասնակից</p><p className="text-white/60 mt-6">Նայեք մեծ էկրանին</p></div></Center>}

      {g.status === 'ended' && <><Confetti /><Center><div className="w-full max-w-md animate-rise">
        <h1 className="text-4xl font-black">Խաղն ավարտվեց</h1>
        <p className="text-2xl font-black mt-3">{rank ? `Դուք ${rank}-րդն եք` : ''} · {me.score} միավոր</p>
        <Podium players={all} />
        <Link href="/join" className="btn mt-8">Միանալ նոր խաղի</Link></div></Center></>}
    </div>
  );
}
