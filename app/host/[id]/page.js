'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import Link from 'next/link';
import { Logo, MuteButton, Spinner, Shape, Podium, Leaderboard, TimerBar, Confetti, useUser } from '@/components/ui';
import { sb, errText, syncClock, serverNow, COLORS } from '@/lib/supabase';
import { sfx } from '@/lib/sound';

export default function Host({ params }) {
  const gid = params.id;
  const user = useUser();
  const [g, setG] = useState(null);
  const [players, setPlayers] = useState([]);
  const [online, setOnline] = useState({});
  const [qr, setQr] = useState('');
  const [left, setLeft] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [err, setErr] = useState('');
  const stepping = useRef(false);

  const loadPlayers = () => sb.from('players').select('*').eq('game_id', gid).eq('kicked', false).order('joined_at').then(({ data }) => setPlayers(data || []));

  useEffect(() => {
    if (user === undefined) return;
    if (!user) { location.href = '/login?next=/host/' + gid; return; }
    syncClock();
    sb.from('games').select('*').eq('id', gid).single().then(({ data, error }) => {
      if (error || data.host !== user.id) return setErr('Խաղը չի գտնվել կամ դուք դրա հաղորդավարը չեք');
      setG(data);
      const url = location.origin + '/join?pin=' + data.pin;
      QRCode.toDataURL(url, { width: 360, margin: 1 }).then(setQr);
    });
    loadPlayers();
    const ch = sb.channel('host-' + gid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: 'game_id=eq.' + gid }, (p) => { if (p.eventType === 'INSERT') sfx.join(); loadPlayers(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: 'id=eq.' + gid }, (p) => setG(p.new))
      .subscribe();
    const pres = sb.channel('game-' + gid, { config: { presence: { key: 'host' } } })
      .on('presence', { event: 'sync' }, () => {
        const st = pres.presenceState(), o = {};
        Object.values(st).flat().forEach((x) => x.pid && (o[x.pid] = true));
        setOnline(o);
      }).subscribe();
    return () => { sb.removeChannel(ch); sb.removeChannel(pres); };
  }, [user]);

  async function step(action) {
    if (stepping.current) return; stepping.current = true;
    const { data, error } = await sb.rpc('host_step', { p_game: gid, p_action: action });
    stepping.current = false;
    if (error) return setErr(errText(error));
    setG(data); if (action === 'reveal' || action === 'leaderboard') loadPlayers();
    if (action === 'next' && data.status === 'question') { setAnswers([]); sfx.start(); }
    if (data.status === 'ended') sfx.win();
  }

  // Ժամաչափ և պատասխանների հաշվարկ
  useEffect(() => {
    if (!g || g.status !== 'question') return;
    const q = g.questions[g.current], total = q.time * 1000, start = new Date(g.started_at).getTime();
    let lastSec = -1;
    const t = setInterval(async () => {
      const l = Math.max(0, total - (serverNow() - start)); setLeft(l);
      const s = Math.ceil(l / 1000); if (s !== lastSec && s <= 5 && s > 0) sfx.tick(); lastSec = s;
      if (l <= 0) { clearInterval(t); step('reveal'); }
    }, 200);
    const poll = setInterval(async () => {
      const { data } = await sb.from('answers').select('player_id,choice,correct,points').eq('game_id', gid).eq('q', g.current);
      setAnswers(data || []);
    }, 1000);
    return () => { clearInterval(t); clearInterval(poll); };
  }, [g?.status, g?.current]);

  useEffect(() => {
    if (g?.status === 'question' && players.length && answers.length >= players.length) step('reveal');
  }, [answers.length]);
  useEffect(() => {
    if (g?.status === 'reveal') sb.from('answers').select('player_id,choice,correct,points').eq('game_id', gid).eq('q', g.current).then(({ data }) => setAnswers(data || []));
  }, [g?.status]);

  const kick = async (p) => { await sb.from('players').update({ kicked: true }).eq('id', p.id); loadPlayers(); };

  if (err) return <main className="p-6"><div className="card max-w-lg mx-auto"><p className="font-bold">{err}</p><Link href="/dashboard" className="btn mt-4">Վահանակ</Link></div></main>;
  if (!g) return <Spinner />;
  const q = g.questions[g.current], n = g.questions.length;

  const Top = () => (
    <header className="flex items-center justify-between gap-3 px-[max(3vw,12px)] py-3">
      <Logo />
      <div className="flex items-center gap-2 font-bold">
        {g.status !== 'lobby' && g.status !== 'ended' && <span className="px-3 py-2 rounded-xl bg-white/10">{g.current + 1} / {n}</span>}
        <span className="px-3 py-2 rounded-xl bg-white/10">PIN {g.pin}</span>
        <MuteButton />
        {g.status !== 'ended' && <button className="btn-ghost" onClick={() => step('end')}>Ավարտել</button>}
      </div>
    </header>
  );

  if (g.status === 'lobby') return (
    <><Top />
      <main className="px-[max(3vw,12px)] pb-10 max-w-6xl mx-auto">
        <section className="card grid md:grid-cols-[1fr_auto] gap-6 items-center animate-rise">
          <div>
            <p className="text-slate-500 font-bold">Միացեք՝ բացելով <b className="text-ink">{typeof window !== 'undefined' ? location.host : ''}/join</b></p>
            <div className="text-slate-500 font-bold mt-3">Խաղի PIN</div>
            <div className="text-6xl sm:text-8xl font-black tracking-[.15em] text-coral leading-none tabular-nums">{g.pin.slice(0, 3)} {g.pin.slice(3)}</div>
            <h1 className="text-2xl font-black mt-4">{g.title}</h1>
          </div>
          {qr && <img src={qr} alt="QR կոդ՝ միանալու համար" className="w-48 h-48 sm:w-60 sm:h-60 rounded-2xl mx-auto" />}
        </section>
        <div className="flex justify-between items-center mt-8 gap-3 flex-wrap">
          <h2 className="text-2xl font-black">{players.length} մասնակից</h2>
          <button className="btn text-lg px-8" disabled={!players.length} onClick={() => step('next')}>Սկսել խաղը</button>
        </div>
        <div className="flex flex-wrap gap-3 mt-5">
          {players.map((p) => (
            <span key={p.id} className="group animate-pop bg-white text-ink rounded-full pl-4 pr-1 py-1 font-bold flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${online[p.id] ? 'bg-a3' : 'bg-slate-300'}`} title={online[p.id] ? 'Առցանց' : 'Անցանց'} />
              {p.nickname}
              <button onClick={() => kick(p)} className="w-8 h-8 rounded-full hover:bg-a0 hover:text-white text-slate-400" aria-label={'Հեռացնել ' + p.nickname} title="Հեռացնել">✕</button>
            </span>
          ))}
          {!players.length && <p className="text-white/60">Սպասում ենք մասնակիցներին…</p>}
        </div>
      </main>
    </>
  );

  if (g.status === 'question' || g.status === 'reveal') {
    const counts = q.options.map((_, j) => answers.filter((a) => a.choice === j).length), mx = Math.max(1, ...counts);
    const rev = g.status === 'reveal';
    return (
      <><Top />
        <main className="px-[max(3vw,12px)] pb-8 max-w-6xl mx-auto" key={g.current}>
          <div className="card text-center text-2xl sm:text-4xl font-black leading-tight animate-rise">{q.text}</div>
          <div className="grid md:grid-cols-[120px_1fr_120px] gap-4 items-center my-5">
            <div className="w-24 h-24 rounded-full bg-coral grid place-items-center text-4xl font-black mx-auto tabular-nums">{rev ? '✓' : Math.ceil(left / 1000)}</div>
            <div className="min-h-[160px] grid place-items-center">
              {rev ? (
                <div className="flex items-end gap-3 h-44 w-full max-w-md">
                  {counts.map((c, j) => <div key={j} className="flex-1 text-center font-black"><div>{c}</div>
                    <div className={`${COLORS[j]} rounded-t-xl transition-all duration-700 ${j === g.revealed ? '' : 'opacity-30'}`} style={{ height: 12 + (c / mx) * 130 }} /><Shape i={j} className="w-6 h-6 mx-auto mt-1" /></div>)}
                </div>
              ) : q.image ? <img src={q.image} alt="" className="max-h-64 rounded-2xl" /> : <TimerBar left={left} total={q.time * 1000} />}
            </div>
            <div className="text-center"><div className="text-4xl font-black tabular-nums">{answers.length}</div><div className="text-white/70 font-bold">պատասխան</div></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {q.options.map((o, j) => (
              <div key={j} className={`${COLORS[j]} rounded-2xl p-5 min-h-[84px] flex items-center gap-4 text-xl sm:text-2xl font-black shadow-[0_6px_0_rgba(0,0,0,.25)] transition ${rev && j !== g.revealed ? 'opacity-30' : ''}`}>
                <Shape i={j} />{o}{rev && j === g.revealed && <span className="ml-auto text-3xl">✓</span>}
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            {rev ? <button className="btn text-lg" onClick={() => step('leaderboard')}>Առաջատարներ</button>
              : <button className="btn-ghost" onClick={() => step('reveal')}>Բաց թողնել ժամաչափը</button>}
          </div>
        </main>
      </>
    );
  }

  if (g.status === 'leaderboard') return (
    <><Top />
      <main className="px-[max(3vw,12px)] pb-8 max-w-2xl mx-auto">
        <h1 className="text-4xl font-black text-center mb-6">Առաջատարներ</h1>
        <Leaderboard players={players} />
        <div className="flex justify-end mt-6"><button className="btn text-lg" onClick={() => step('next')}>{g.current + 1 >= n ? 'Արդյունքներ' : 'Հաջորդ հարցը'}</button></div>
      </main>
    </>
  );

  return (
    <><Top /><Confetti />
      <main className="px-[max(3vw,12px)] pb-10 max-w-3xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl font-black animate-pop">Հաղթողներ</h1>
        <p className="text-white/70 mt-2">{g.title} · {players.length} մասնակից</p>
        <Podium players={players} />
        <div className="mt-8 text-left"><Leaderboard players={players} /></div>
        <div className="flex gap-3 justify-center mt-8 flex-wrap">
          <button className="btn" onClick={async () => { const r = await sb.rpc('create_game', { p_quiz: g.quiz_id }); if (r.error) setErr(errText(r.error)); else location.href = '/host/' + r.data.id; }}>Խաղալ նորից</button>
          <Link href="/dashboard" className="btn-ghost">Վահանակ</Link>
        </div>
      </main>
    </>
  );
}
