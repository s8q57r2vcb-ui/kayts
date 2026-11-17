'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Nav, Spinner, useUser, isReal } from '@/components/ui';
import { sb, errText } from '@/lib/supabase';

const TABS = [['mine', 'Իմ վիկտորինաները'], ['saved', 'Պահվածներ'], ['public', 'Հանրային'], ['history', 'Խաղերի պատմություն'], ['stats', 'Վիճակագրություն']];
const fmt = (d) => new Date(d).toLocaleDateString('hy-AM', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Dashboard() {
  const user = useUser();
  const [tab, setTab] = useState('mine');
  const [profile, setProfile] = useState(null);
  const [mine, setMine] = useState([]); const [saved, setSaved] = useState([]); const [pub, setPub] = useState([]);
  const [games, setGames] = useState([]); const [played, setPlayed] = useState([]); const [stats, setStats] = useState(null);
  const [q, setQ] = useState(''); const [vis, setVis] = useState('all'); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState('');

  useEffect(() => { if (user === null || (user && !isReal(user))) location.href = '/login?next=/dashboard'; }, [user]);

  async function load() {
    const uid = user.id;
    const [p, m, s, g, pl] = await Promise.all([
      sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
      sb.from('quizzes').select('*').eq('owner', uid).order('updated_at', { ascending: false }),
      sb.from('saved_quizzes').select('quiz_id, quizzes(*)').eq('user_id', uid),
      sb.from('games').select('id,title,status,created_at,ended_at,players(count)').eq('host', uid).order('created_at', { ascending: false }).limit(30),
      sb.from('players').select('id,score,nickname,joined_at,games(title,id)').eq('user_id', uid).order('joined_at', { ascending: false }).limit(20),
    ]);
    setProfile(p.data || { id: uid, name: user.email });
    setMine(m.data || []); setSaved((s.data || []).map((r) => r.quizzes).filter(Boolean));
    setGames(g.data || []); setPlayed(pl.data || []);
    const ids = (g.data || []).map((x) => x.id);
    let acc = null, ans = 0;
    if (ids.length) {
      const { data: a } = await sb.from('answers').select('correct').in('game_id', ids);
      ans = a?.length || 0; acc = ans ? Math.round((a.filter((x) => x.correct).length / ans) * 100) : null;
    }
    setStats({ quizzes: m.data?.length || 0, games: ids.length, players: (g.data || []).reduce((t, x) => t + (x.players?.[0]?.count || 0), 0), answers: ans, acc });
  }
  useEffect(() => { if (isReal(user)) load(); }, [user]);
  useEffect(() => { if (tab === 'public' && !pub.length) sb.from('quizzes').select('*').eq('is_public', true).order('plays', { ascending: false }).limit(50).then(({ data }) => setPub(data || [])); }, [tab]);

  const list = tab === 'mine' ? mine : tab === 'saved' ? saved : pub;
  const filtered = useMemo(() => list.filter((x) => (vis === 'all' || (vis === 'pub' ? x.is_public : !x.is_public)) && (x.title + ' ' + (x.description || '')).toLowerCase().includes(q.toLowerCase())), [list, q, vis]);

  async function host(id) {
    setBusy(id); setMsg('');
    const { data, error } = await sb.rpc('create_game', { p_quiz: id });
    setBusy('');
    if (error) return setMsg(errText(error));
    location.href = '/host/' + data.id;
  }
  async function dup(x) {
    const { error } = await sb.from('quizzes').insert({ title: x.title + ' (պատճեն)', description: x.description, questions: x.questions, is_public: false });
    if (error) setMsg(errText(error)); else { setMsg('Պատճենը ստեղծվեց'); load(); }
  }
  async function del(x) {
    if (busy !== 'del' + x.id) { setBusy('del' + x.id); setTimeout(() => setBusy((b) => (b === 'del' + x.id ? '' : b)), 3000); return; }
    await sb.from('quizzes').delete().eq('id', x.id); setBusy(''); load();
  }
  async function togglePub(x) { await sb.from('quizzes').update({ is_public: !x.is_public }).eq('id', x.id); load(); }
  async function toggleSave(x) {
    const isSaved = saved.some((s) => s.id === x.id);
    if (isSaved) await sb.from('saved_quizzes').delete().eq('quiz_id', x.id).eq('user_id', user.id);
    else await sb.from('saved_quizzes').insert({ quiz_id: x.id });
    load();
  }
  async function share(x) {
    const url = location.origin + '/quiz/' + x.id;
    try { await navigator.clipboard.writeText(url); setMsg('Հղումը պատճենվեց' + (x.is_public ? '' : '։ Մյուսները կտեսնեն այն, երբ վիկտորինան դարձնեք հանրային')); } catch { setMsg(url); }
  }
  async function saveName(e) { e.preventDefault(); await sb.from('profiles').upsert({ id: user.id, name: profile.name }); setMsg('Պրոֆիլը պահպանվեց'); }

  if (!isReal(user) || !stats) return <><Nav /><Spinner /></>;
  return (
    <><Nav />
      <main className="px-[max(4vw,16px)] pb-16 max-w-6xl mx-auto">
        <section className="grid md:grid-cols-[1fr_auto] gap-4 items-center">
          <form onSubmit={saveName} className="flex items-center gap-4 flex-wrap">
            <div className="w-16 h-16 rounded-2xl bg-coral grid place-items-center text-3xl font-black">{(profile?.name || '?')[0]}</div>
            <div><label className="text-white/60 text-sm font-bold" htmlFor="pn">Պրոֆիլ</label>
              <div className="flex gap-2"><input id="pn" className="input !bg-white/10 !text-white !border-white/20 font-black text-xl" value={profile?.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                <button className="btn-ghost">Պահել</button></div>
              <p className="text-white/50 text-sm mt-1">{user.email}</p></div>
          </form>
          <Link href="/create" className="btn text-lg">+ Նոր վիկտորինա</Link>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
          {[['Վիկտորինա', stats.quizzes], ['Անցկացված խաղ', stats.games], ['Մասնակից', stats.players], ['Ճշտություն', stats.acc == null ? '—' : stats.acc + '%']].map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-white/10 p-4"><div className="text-3xl font-black tabular-nums">{v}</div><div className="text-white/70 text-sm font-semibold">{l}</div></div>
          ))}
        </section>

        {msg && <div className="mt-6 rounded-xl bg-white text-ink p-3 font-semibold flex justify-between gap-3"><span className="break-all">{msg}</span><button onClick={() => setMsg('')} aria-label="Փակել">✕</button></div>}

        <nav className="flex gap-2 mt-8 overflow-x-auto pb-2">
          {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`flex-none min-h-[44px] px-4 rounded-xl font-bold ${tab === k ? 'bg-white text-ink' : 'bg-white/10 hover:bg-white/20'}`}>{l}</button>)}
        </nav>

        {['mine', 'saved', 'public'].includes(tab) && (
          <>
            <div className="flex gap-2 mt-4 flex-wrap">
              <input className="input flex-1 min-w-[200px]" placeholder="Որոնել վիկտորինաներ…" value={q} onChange={(e) => setQ(e.target.value)} />
              {tab === 'mine' && <select className="input !w-auto" value={vis} onChange={(e) => setVis(e.target.value)}><option value="all">Բոլորը</option><option value="pub">Հանրային</option><option value="priv">Անձնական</option></select>}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {filtered.map((x) => (
                <article key={x.id} className="card !p-5 flex flex-col animate-rise">
                  <div className="flex justify-between gap-2 items-start">
                    <h3 className="font-black text-lg leading-tight">{x.title}</h3>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg flex-none ${x.is_public ? 'bg-a3/15 text-a3' : 'bg-slate-100 text-slate-500'}`}>{x.is_public ? 'Հանրային' : 'Անձնական'}</span>
                  </div>
                  <p className="text-slate-500 text-sm mt-1 line-clamp-2">{x.description || ' '}</p>
                  <p className="text-slate-400 text-sm mt-2">{x.questions.length} հարց · {x.plays} խաղ · {fmt(x.updated_at)}</p>
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button className="btn !min-h-[40px] !px-4" onClick={() => host(x.id)} disabled={busy === x.id}>{busy === x.id ? '…' : 'Խաղալ'}</button>
                    {x.owner === user.id ? <>
                      <Link href={'/create?id=' + x.id} className="btn-light">Խմբագրել</Link>
                      <button className="btn-light" onClick={() => dup(x)}>Պատճենել</button>
                      <button className="btn-light" onClick={() => togglePub(x)}>{x.is_public ? 'Դարձնել անձնական' : 'Դարձնել հանրային'}</button>
                      <button className="btn-light" onClick={() => share(x)}>Կիսվել</button>
                      <button className={`btn-light ${busy === 'del' + x.id ? '!bg-a0 !text-white !border-a0' : ''}`} onClick={() => del(x)}>{busy === 'del' + x.id ? 'Հաստատե՞լ' : 'Ջնջել'}</button>
                    </> : <>
                      <button className="btn-light" onClick={() => toggleSave(x)}>{saved.some((s) => s.id === x.id) ? 'Հանել պահվածներից' : 'Պահել'}</button>
                      <button className="btn-light" onClick={() => dup(x)}>Պատճենել ինձ մոտ</button>
                    </>}
                  </div>
                </article>
              ))}
            </div>
            {!filtered.length && <div className="mt-8 rounded-2xl border-2 border-dashed border-white/25 p-10 text-center text-white/70">
              {tab === 'mine' ? <>Դեռ վիկտորինաներ չունեք։ <Link href="/create" className="text-coral font-bold">Ստեղծեք առաջինը</Link></> : tab === 'saved' ? 'Պահված վիկտորինաներ չկան։ Գտեք դրանք «Հանրային» բաժնում։' : 'Ոչինչ չի գտնվել'}
            </div>}
          </>
        )}

        {tab === 'history' && (
          <div className="grid lg:grid-cols-2 gap-6 mt-4">
            <div><h2 className="font-black text-xl mb-3">Ձեր անցկացրած խաղերը</h2>
              <ul className="space-y-2">{games.map((g) => (
                <li key={g.id} className="rounded-xl bg-white/10 p-4 flex justify-between gap-3 flex-wrap">
                  <div><div className="font-bold">{g.title}</div><div className="text-white/60 text-sm">{fmt(g.created_at)} · {g.players?.[0]?.count || 0} մասնակից</div></div>
                  <Link className="btn-ghost !min-h-[40px]" href={'/host/' + g.id}>{g.status === 'ended' ? 'Արդյունքներ' : 'Շարունակել'}</Link>
                </li>))}
                {!games.length && <li className="text-white/60">Դեռ խաղեր չեք անցկացրել։</li>}</ul></div>
            <div><h2 className="font-black text-xl mb-3">Ձեր մասնակցությունները</h2>
              <ul className="space-y-2">{played.map((p) => (
                <li key={p.id} className="rounded-xl bg-white/10 p-4 flex justify-between"><div><div className="font-bold">{p.games?.title}</div><div className="text-white/60 text-sm">{fmt(p.joined_at)} · «{p.nickname}»</div></div><div className="font-black tabular-nums">{p.score}</div></li>))}
                {!played.length && <li className="text-white/60">Մուտք գործած վիճակում խաղերին մասնակցելիս դրանք կհայտնվեն այստեղ։</li>}</ul></div>
          </div>
        )}

        {tab === 'stats' && (
          <div className="card mt-4">
            <h2 className="font-black text-xl">Ձեր վիկտորինաների արդյունքները</h2>
            <p className="text-slate-500">Ընդհանուր {stats.answers} պատասխան՝ {stats.games} խաղում։</p>
            <div className="mt-6 space-y-3">
              {mine.filter((x) => x.plays).sort((a, b) => b.plays - a.plays).slice(0, 8).map((x) => {
                const mx = Math.max(...mine.map((m) => m.plays), 1);
                return <div key={x.id}><div className="flex justify-between text-sm font-bold"><span className="truncate">{x.title}</span><span>{x.plays} խաղ</span></div>
                  <div className="h-3 bg-slate-100 rounded-full mt-1"><div className="h-3 rounded-full bg-a1" style={{ width: (x.plays / mx) * 100 + '%' }} /></div></div>;
              })}
              {!mine.some((x) => x.plays) && <p className="text-slate-500">Վիճակագրությունը կհայտնվի առաջին խաղից հետո։</p>}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
