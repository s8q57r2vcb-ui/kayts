'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Nav, Spinner, Shape, useUser, isReal } from '@/components/ui';
import { sb, errText, COLORS } from '@/lib/supabase';

export default function QuizPage({ params }) {
  const user = useUser();
  const [qz, setQz] = useState(undefined); const [msg, setMsg] = useState('');
  useEffect(() => { if (user !== undefined) sb.from('quizzes').select('*').eq('id', params.id).maybeSingle().then(({ data }) => setQz(data)); }, [user]);

  const need = () => { if (!isReal(user)) { location.href = '/login?next=/quiz/' + params.id; return true; } };
  async function host() { if (need()) return; const r = await sb.rpc('create_game', { p_quiz: qz.id }); if (r.error) setMsg(errText(r.error)); else location.href = '/host/' + r.data.id; }
  async function save() { if (need()) return; const r = await sb.from('saved_quizzes').upsert({ quiz_id: qz.id }); setMsg(r.error ? errText(r.error) : 'Պահվեց ձեր գրադարանում'); }

  if (qz === undefined) return <><Nav /><Spinner /></>;
  if (!qz) return <><Nav /><main className="p-6"><div className="card max-w-lg mx-auto"><h1 className="text-2xl font-black">Վիկտորինան հասանելի չէ</h1><p className="text-slate-500 mt-2">Այն կա՛մ ջնջված է, կա՛մ անձնական է։</p><Link href="/" className="btn mt-4">Գլխավոր</Link></div></main></>;
  return (
    <><Nav />
      <main className="px-[max(4vw,16px)] pb-16 max-w-3xl mx-auto">
        <div className="card animate-rise">
          <h1 className="text-3xl sm:text-4xl font-black">{qz.title}</h1>
          {qz.description && <p className="text-slate-500 mt-2">{qz.description}</p>}
          <p className="text-slate-400 mt-2">{qz.questions.length} հարց · {qz.plays} անգամ խաղացված</p>
          <div className="flex gap-2 mt-5 flex-wrap"><button className="btn" onClick={host}>Անցկացնել խաղ</button><button className="btn-light" onClick={save}>Պահել</button></div>
          {msg && <p className="mt-3 font-bold">{msg}</p>}
        </div>
        <ol className="mt-6 space-y-3">
          {qz.questions.map((q, i) => (
            <li key={i} className="rounded-2xl bg-white/10 p-4"><div className="font-bold">{i + 1}. {q.text}</div>
              <div className="flex gap-2 mt-2 flex-wrap">{q.options.map((o, j) => <span key={j} className={`${COLORS[j]} rounded-lg px-2 py-1 text-sm font-bold flex items-center gap-1`}><Shape i={j} className="w-3.5 h-3.5" />{o}</span>)}</div></li>
          ))}
        </ol>
      </main>
    </>
  );
}
