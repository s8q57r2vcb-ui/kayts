'use client';
import Link from 'next/link';
import { Nav, Shape, SetupWarning } from '@/components/ui';

const STEPS = [
  ['Ստեղծեք', 'Գրեք հարցերը, ավելացրեք նկարներ, ընտրեք ճիշտ պատասխանն ու ժամանակը։ Երկու րոպեն բավական է։'],
  ['Սկսեք խաղը', 'Էկրանին կհայտնվի PIN կոդ և QR կոդ։ Ցույց տվեք դրանք պրոյեկտորով կամ էկրանով։'],
  ['Խաղացեք միասին', 'Մասնակիցները միանում են հեռախոսից՝ առանց գրանցման, և մրցում են իրական ժամանակում։'],
];
const FEATURES = [
  ['Իրական ժամանակ', 'Հարցերը, ժամաչափը և միավորները համաժամեցված են բոլոր սարքերում։'],
  ['Արագությունը կարևոր է', 'Միավորները հաշվվում են սերվերում՝ ըստ ճշտության և արագության, շարքի բոնուսով։'],
  ['Առանց գրանցման', 'Մասնակիցներին պետք է միայն PIN կոդը և մականունը։'],
  ['Հարցերի տեսակներ', 'Բազմընտրանք, ճիշտ/սխալ, նկարով հարցեր և ճկուն ժամաչափ։'],
  ['Գրադարան', 'Պահեք ձեր վիկտորինաները, կիսվեք դրանցով, դարձրեք հանրային։'],
  ['Վիճակագրություն', 'Խաղերի պատմություն, ճշտության տոկոս և լավագույն մասնակիցներ։'],
];

export default function Home() {
  return (
    <>
      <Nav />
      <SetupWarning />
      <main>
        <section className="px-[max(5vw,16px)] pt-6 pb-16 max-w-6xl mx-auto grid md:grid-cols-[1.1fr_1fr] gap-10 items-center">
          <div className="animate-rise">
            <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] text-balance">Սովորելը դարձրեք խաղ, որին բոլորը կմասնակցեն</h1>
            <p className="mt-5 text-lg text-white/80 max-w-xl">«Կայծ»-ով ստեղծեք վիկտորինաներ րոպեների ընթացքում և անցկացրեք կենդանի մրցույթներ դասարանում, դասընթացում կամ ընկերների հետ։</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/create" className="btn text-lg px-7">Ստեղծել վիկտորինա</Link>
              <Link href="/join" className="btn-ghost text-lg px-7">Միանալ խաղին</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 rotate-[-3deg]" aria-hidden>
            {['Արագած', 'Կապուտջուղ', 'Աժդահակ', 'Արայի լեռ'].map((t, i) => (
              <div key={i} className={`${['bg-a0', 'bg-a1', 'bg-a2', 'bg-a3'][i]} rounded-2xl p-5 min-h-[110px] flex items-center gap-3 font-black text-xl shadow-[0_8px_0_rgba(0,0,0,.25)] animate-pop`} style={{ animationDelay: i * 0.12 + 's', animationFillMode: 'both' }}>
                <Shape i={i} />{t}
              </div>
            ))}
            <div className="col-span-2 card text-center font-black text-xl -order-1">Ո՞րն է Հայաստանի ամենաբարձր գագաթը</div>
          </div>
        </section>

        <section className="bg-white text-ink px-[max(5vw,16px)] py-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black">Ինչպես է աշխատում</h2>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              {STEPS.map(([t, d], i) => (
                <div key={i}><div className={`w-12 h-12 rounded-xl ${['bg-a0', 'bg-a1', 'bg-a3'][i]} grid place-items-center`}><Shape i={i} className="w-6 h-6" /></div>
                  <h3 className="text-xl font-black mt-4">{t}</h3><p className="text-slate-600 mt-2">{d}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-[max(5vw,16px)] py-16 max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black">Հնարավորություններ</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {FEATURES.map(([t, d]) => (
              <div key={t} className="rounded-2xl bg-white/10 p-6 hover:bg-white/15 transition"><h3 className="font-black text-lg">{t}</h3><p className="text-white/75 mt-2">{d}</p></div>
            ))}
          </div>
        </section>
      </main>
      <footer className="bg-deep px-[max(5vw,16px)] py-10 mt-6">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between gap-6 items-center">
          <div><div className="font-black text-2xl">Կայծ<span className="text-coral">!</span></div><p className="text-white/60 text-sm mt-1">Խաղային վիկտորինաներ հայերենով</p></div>
          <div className="flex gap-4 text-white/80 font-semibold flex-wrap">
            <Link href="/join">Միանալ</Link><Link href="/create">Ստեղծել</Link><Link href="/dashboard">Վահանակ</Link><Link href="/login">Մուտք</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
