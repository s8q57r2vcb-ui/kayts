'use client';
import { useEffect, useState } from 'react';
import { Nav, Spinner, Shape, useUser, isReal } from '@/components/ui';
import { sb, errText, COLORS } from '@/lib/supabase';

const TIMES = [5, 10, 20, 30, 60, 90];
const blank = (type = 'mc') => type === 'tf'
  ? { type: 'tf', text: '', image: '', options: ['Ճիշտ է', 'Սխալ է'], correct: 0, time: 20 }
  : { type: 'mc', text: '', image: '', options: ['', '', '', ''], correct: 0, time: 20 };

export default function Create() {
  const user = useUser();
  const [id, setId] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [sel, setSel] = useState(0);
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [up, setUp] = useState(false);

  useEffect(() => {
    if (user === undefined) return;
    if (!isReal(user)) { location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search); return; }
    const qid = new URLSearchParams(location.search).get('id');
    if (!qid) { setQuiz({ title: '', description: '', is_public: false, questions: [blank()] }); return; }
    sb.from('quizzes').select('*').eq('id', qid).single().then(({ data, error }) => {
      if (error || data.owner !== user.id) { setMsg('Վիկտորինան չի գտնվել'); setQuiz({ title: '', description: '', is_public: false, questions: [blank()] }); return; }
      setId(qid); setQuiz({ title: data.title, description: data.description || '', is_public: data.is_public, questions: data.questions.length ? data.questions : [blank()] });
    });
  }, [user]);

  if (!quiz) return <><Nav /><Spinner /></>;
  const qs = quiz.questions, cur = qs[sel] || qs[0];
  const setQs = (n) => setQuiz({ ...quiz, questions: n });
  const upd = (patch) => setQs(qs.map((q, i) => (i === sel ? { ...q, ...patch } : q)));
  const move = (d) => { const j = sel + d; if (j < 0 || j >= qs.length) return; const n = [...qs]; [n[sel], n[j]] = [n[j], n[sel]]; setQs(n); setSel(j); };
  const add = (type) => { setQs([...qs, blank(type)]); setSel(qs.length); };
  const dup = () => { const n = [...qs]; n.splice(sel + 1, 0, JSON.parse(JSON.stringify(cur))); setQs(n); setSel(sel + 1); };
  const del = () => { if (qs.length === 1) return setQs([blank()]); setQs(qs.filter((_, i) => i !== sel)); setSel(Math.max(0, sel - 1)); };
  const setType = (type) => { if (type === cur.type) return; upd(type === 'tf' ? { type, options: ['Ճիշտ է', 'Սխալ է'], correct: 0 } : { type, options: ['', '', '', ''], correct: 0 }); };
  const setOpt = (j, v) => upd({ options: cur.options.map((o, k) => (k === j ? v : o)) });
  const addOpt = () => cur.options.length < 4 && upd({ options: [...cur.options, ''] });
  const delOpt = (j) => { if (cur.options.length <= 2) return; const o = cur.options.filter((_, k) => k !== j); upd({ options: o, correct: cur.correct === j ? 0 : cur.correct > j ? cur.correct - 1 : cur.correct }); };

  async function upload(e) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setMsg('Նկարը պետք է լինի 5 ՄԲ-ից փոքր');
    setUp(true);
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.]/g, '')}`;
    const { error } = await sb.storage.from('images').upload(path, file);
    setUp(false);
    if (error) return setMsg(errText(error));
    upd({ image: sb.storage.from('images').getPublicUrl(path).data.publicUrl });
  }

  function validate() {
    if (!quiz.title.trim()) return 'Մուտքագրեք վիկտորինայի անվանումը';
    for (let i = 0; i < qs.length; i++) {
      if (!qs[i].text.trim()) { setSel(i); return `Հարց ${i + 1}-ի տեքստը դատարկ է`; }
      if (qs[i].options.some((o) => !o.trim())) { setSel(i); return `Հարց ${i + 1}-ում կա դատարկ պատասխան`; }
    }
  }
  async function save(play) {
    const v = validate(); if (v) return setMsg(v);
    setBusy(true); setMsg('');
    const row = { title: quiz.title.trim(), description: quiz.description.trim(), is_public: quiz.is_public, questions: qs, updated_at: new Date().toISOString() };
    const r = id ? await sb.from('quizzes').update(row).eq('id', id).select().single() : await sb.from('quizzes').insert(row).select().single();
    if (r.error) { setBusy(false); return setMsg(errText(r.error)); }
    setId(r.data.id); history.replaceState(null, '', '/create?id=' + r.data.id);
    if (play) {
      const g = await sb.rpc('create_game', { p_quiz: r.data.id });
      if (g.error) { setBusy(false); return setMsg(errText(g.error)); }
      location.href = '/host/' + g.data.id; return;
    }
    setBusy(false); setMsg('Պահպանված է ✓');
  }

  return (
    <><Nav />
      <main className="px-[max(3vw,12px)] pb-16 max-w-7xl mx-auto">
        <div className="card !p-4 sm:!p-5 grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <label><span className="label">Վիկտորինայի անվանում</span><input className="input font-bold text-lg" value={quiz.title} placeholder="Օր.՝ Հայոց պատմություն" onChange={(e) => setQuiz({ ...quiz, title: e.target.value })} /></label>
          <label><span className="label">Նկարագրություն</span><input className="input" value={quiz.description} placeholder="Կարճ նկարագրություն" onChange={(e) => setQuiz({ ...quiz, description: e.target.value })} /></label>
          <div className="flex gap-2 flex-wrap">
            <label className="btn-light cursor-pointer"><input type="checkbox" checked={quiz.is_public} onChange={(e) => setQuiz({ ...quiz, is_public: e.target.checked })} className="w-5 h-5 accent-coral" />Հանրային</label>
            <button className="btn-light" onClick={() => save(false)} disabled={busy}>Պահպանել</button>
            <button className="btn" onClick={() => save(true)} disabled={busy}>{busy ? 'Սպասեք…' : 'Պահել և խաղալ'}</button>
          </div>
        </div>
        {msg && <p className="mt-3 rounded-xl bg-white text-ink px-4 py-2 font-semibold">{msg}</p>}

        <div className="grid lg:grid-cols-[260px_1fr] gap-4 mt-4">
          <aside className="space-y-2 lg:max-h-[75vh] lg:overflow-y-auto pr-1">
            {qs.map((q, i) => (
              <button key={i} onClick={() => setSel(i)} className={`w-full text-left rounded-xl p-3 font-semibold transition ${i === sel ? 'bg-white text-ink' : 'bg-white/10 hover:bg-white/20'}`}>
                <span className="text-xs opacity-60">{i + 1} · {q.type === 'tf' ? 'Ճիշտ/Սխալ' : 'Բազմընտրանք'} · {q.time} վրկ</span>
                <span className="block truncate">{q.text || 'Նոր հարց'}</span>
              </button>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost !text-sm" onClick={() => add('mc')}>+ Բազմընտրանք</button>
              <button className="btn-ghost !text-sm" onClick={() => add('tf')}>+ Ճիշտ/Սխալ</button>
            </div>
          </aside>

          <section className="card !p-4 sm:!p-6">
            <div className="flex flex-wrap gap-2 justify-between items-center mb-4">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {[['mc', 'Բազմընտրանք'], ['tf', 'Ճիշտ/Սխալ']].map(([k, l]) => <button key={k} onClick={() => setType(k)} className={`px-3 min-h-[40px] rounded-lg font-bold ${cur.type === k ? 'bg-white shadow' : 'text-slate-500'}`}>{l}</button>)}
              </div>
              <div className="flex gap-2 flex-wrap">
                <label className="flex items-center gap-2 font-bold"><span className="text-sm text-slate-500">Ժամանակ</span>
                  <select className="input !w-auto" value={cur.time} onChange={(e) => upd({ time: +e.target.value })}>{TIMES.map((t) => <option key={t} value={t}>{t} վրկ</option>)}</select></label>
                <button className="btn-light" onClick={() => move(-1)} disabled={sel === 0} aria-label="Տեղափոխել վերև">↑</button>
                <button className="btn-light" onClick={() => move(1)} disabled={sel === qs.length - 1} aria-label="Տեղափոխել ներքև">↓</button>
                <button className="btn-light" onClick={dup}>Կրկնօրինակել</button>
                <button className="btn-light hover:!bg-a0 hover:!text-white" onClick={del}>Ջնջել</button>
              </div>
            </div>

            <textarea className="input text-center text-xl sm:text-2xl font-black min-h-[90px]" placeholder="Գրեք հարցը այստեղ" value={cur.text} onChange={(e) => upd({ text: e.target.value })} />

            <div className="my-4 grid place-items-center">
              {cur.image ? (
                <div className="relative"><img src={cur.image} alt="Հարցի նկար" className="max-h-56 rounded-xl" />
                  <button className="absolute top-2 right-2 bg-black/60 text-white rounded-lg px-3 py-1 font-bold" onClick={() => upd({ image: '' })}>Հեռացնել</button></div>
              ) : (
                <label className="w-full max-w-md border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center text-slate-500 font-bold cursor-pointer hover:border-coral">
                  {up ? 'Վերբեռնվում է…' : 'Ավելացնել նկար (ոչ պարտադիր)'}
                  <input type="file" accept="image/*" className="hidden" onChange={upload} />
                </label>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {cur.options.map((o, j) => (
                <div key={j} className={`${COLORS[j]} rounded-2xl p-3 flex items-center gap-3 text-white`}>
                  <Shape i={j} className="w-7 h-7" />
                  <input className="flex-1 bg-transparent placeholder-white/70 font-bold text-lg outline-none min-h-[44px]" value={o} disabled={cur.type === 'tf'} placeholder={`Պատասխան ${j + 1}`} onChange={(e) => setOpt(j, e.target.value)} />
                  <button onClick={() => upd({ correct: j })} aria-label="Նշել որպես ճիշտ" title="Ճիշտ պատասխան" className={`w-10 h-10 rounded-full border-4 border-white grid place-items-center font-black flex-none ${cur.correct === j ? 'bg-white text-a3' : ''}`}>{cur.correct === j ? '✓' : ''}</button>
                  {cur.type === 'mc' && cur.options.length > 2 && <button onClick={() => delOpt(j)} aria-label="Հեռացնել պատասխանը" className="w-8 h-8 rounded-lg bg-black/20 font-bold flex-none">✕</button>}
                </div>
              ))}
            </div>
            {cur.type === 'mc' && cur.options.length < 4 && <button className="btn-light mt-3" onClick={addOpt}>+ Ավելացնել պատասխան</button>}
            <p className="text-slate-500 text-sm mt-4">Սեղմեք շրջանակին՝ ճիշտ պատասխանը նշելու համար։</p>
          </section>
        </div>
      </main>
    </>
  );
}
