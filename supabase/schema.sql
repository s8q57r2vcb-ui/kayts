-- «Կայծ» — Supabase-ի տվյալների բազայի սխեմա
-- Գործարկեք ամբողջությամբ Supabase → SQL Editor-ում։

create extension if not exists pgcrypto;

-- Օգտատերերի պրոֆիլներ
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default 'Օգտատեր',
  created_at timestamptz default now()
);

-- Վիկտորինաներ (հարցերը պահվում են JSON-ով)
-- questions: [{type:'mc'|'tf', text, image, options:[...], correct:int, time:int}]
create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users on delete cascade default auth.uid(),
  title text not null,
  description text default '',
  is_public boolean default false,
  questions jsonb not null default '[]',
  plays int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists saved_quizzes (
  user_id uuid references auth.users on delete cascade default auth.uid(),
  quiz_id uuid references quizzes on delete cascade,
  primary key (user_id, quiz_id)
);

-- Խաղային սեսիաներ
-- status: lobby | question | reveal | leaderboard | ended
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  pin text unique not null,
  quiz_id uuid references quizzes on delete set null,
  host uuid not null references auth.users on delete cascade,
  title text not null,
  questions jsonb not null,          -- առանց ճիշտ պատասխանների
  status text not null default 'lobby',
  current int not null default -1,
  started_at timestamptz,            -- ընթացիկ հարցի սկիզբը (սերվերի ժամ)
  revealed int,                      -- ճիշտ պատասխանը՝ բացահայտումից հետո
  created_at timestamptz default now(),
  ended_at timestamptz
);

-- Ճիշտ պատասխանները՝ միայն հաղորդավարի և սերվերի համար
create table if not exists game_keys (
  game_id uuid primary key references games on delete cascade,
  keys int[] not null,
  times int[] not null
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  nickname text not null,
  score int not null default 0,
  streak int not null default 0,
  kicked boolean default false,
  joined_at timestamptz default now(),
  unique (game_id, user_id)
);
create unique index if not exists players_nick on players (game_id, lower(nickname)) where not kicked;

create table if not exists answers (
  id bigserial primary key,
  game_id uuid not null references games on delete cascade,
  player_id uuid not null references players on delete cascade,
  q int not null,
  choice int not null,
  correct boolean not null,
  points int not null,
  ms int not null,
  created_at timestamptz default now(),
  unique (player_id, q)              -- կրկնակի պատասխան հնարավոր չէ
);

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table quizzes enable row level security;
alter table saved_quizzes enable row level security;
alter table games enable row level security;
alter table game_keys enable row level security;
alter table players enable row level security;
alter table answers enable row level security;

create policy p_read on profiles for select using (true);
create policy p_ins on profiles for insert with check (id = auth.uid());
create policy p_upd on profiles for update using (id = auth.uid());

create policy q_read on quizzes for select using (is_public or owner = auth.uid());
create policy q_ins on quizzes for insert with check (owner = auth.uid());
create policy q_upd on quizzes for update using (owner = auth.uid());
create policy q_del on quizzes for delete using (owner = auth.uid());

create policy s_all on saved_quizzes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy g_read on games for select using (true);
create policy g_upd on games for update using (host = auth.uid());
create policy g_del on games for delete using (host = auth.uid());
-- game_keys: քաղաքականություն չկա → հասանելի է միայն security definer ֆունկցիաներին

create policy pl_read on players for select using (true);
create policy pl_upd on players for update using (
  exists (select 1 from games g where g.id = game_id and g.host = auth.uid()));

create policy a_read on answers for select using (
  exists (select 1 from players p where p.id = player_id and p.user_id = auth.uid())
  or exists (select 1 from games g where g.id = game_id and g.host = auth.uid()));

-- ---------- Ֆունկցիաներ ----------
create or replace function server_now() returns timestamptz language sql stable as $$ select now() $$;

-- Ստեղծում է խաղ՝ եզակի PIN-ով
create or replace function create_game(p_quiz uuid) returns games
language plpgsql security definer set search_path = public as $$
declare qz quizzes; g games; v_pin text; qs jsonb;
begin
  if auth.uid() is null then raise exception 'Մուտք գործեք'; end if;
  select * into qz from quizzes where id = p_quiz and (owner = auth.uid() or is_public);
  if qz.id is null then raise exception 'Վիկտորինան չի գտնվել'; end if;
  if jsonb_array_length(qz.questions) = 0 then raise exception 'Վիկտորինան հարցեր չունի'; end if;
  loop
    v_pin := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from games where pin = v_pin and status <> 'ended');
  end loop;
  -- ավարտված հին խաղի PIN-ն ազատում ենք
  update games set pin = pin || '-' || substr(id::text, 1, 8) where pin = v_pin;
  select jsonb_agg(q - 'correct') into qs from jsonb_array_elements(qz.questions) q;
  insert into games (pin, quiz_id, host, title, questions)
    values (v_pin, qz.id, auth.uid(), qz.title, qs) returning * into g;
  insert into game_keys values (g.id,
    (select array_agg((q->>'correct')::int order by o) from jsonb_array_elements(qz.questions) with ordinality t(q, o)),
    (select array_agg(coalesce((q->>'time')::int, 20) order by o) from jsonb_array_elements(qz.questions) with ordinality t(q, o)));
  update quizzes set plays = plays + 1 where id = qz.id;
  return g;
end $$;

-- Միանալ խաղին PIN-ով (անանուն մուտքով)
create or replace function join_game(p_pin text, p_nick text) returns players
language plpgsql security definer set search_path = public as $$
declare g games; pl players; nick text := trim(p_nick);
begin
  if auth.uid() is null then raise exception 'Կապի սխալ, թարմացրեք էջը'; end if;
  if length(nick) < 1 or length(nick) > 16 then raise exception 'Անունը պետք է լինի 1–16 նիշ'; end if;
  select * into g from games where pin = p_pin and status <> 'ended';
  if g.id is null then raise exception 'Այդ PIN-ով խաղ չկա'; end if;
  select * into pl from players where game_id = g.id and user_id = auth.uid();
  if pl.id is not null then
    if pl.kicked then raise exception 'Հաղորդավարը ձեզ հեռացրել է խաղից'; end if;
    return pl; -- վերամիացում
  end if;
  if g.status <> 'lobby' then raise exception 'Խաղն արդեն սկսվել է'; end if;
  if exists (select 1 from players where game_id = g.id and lower(nickname) = lower(nick) and not kicked) then
    raise exception 'Այդ անունն արդեն զբաղված է';
  end if;
  insert into players (game_id, user_id, nickname) values (g.id, auth.uid(), nick) returning * into pl;
  return pl;
end $$;

-- Պատասխան. միավորները հաշվվում են սերվերում
create or replace function submit_answer(p_game uuid, p_q int, p_choice int) returns answers
language plpgsql security definer set search_path = public as $$
declare g games; k game_keys; pl players; a answers; v_ms int; v_lim int; ok boolean; pts int := 0;
begin
  select * into g from games where id = p_game;
  if g.status <> 'question' or g.current <> p_q then raise exception 'Պատասխանի ժամանակն անցել է'; end if;
  select * into pl from players where game_id = p_game and user_id = auth.uid() and not kicked;
  if pl.id is null then raise exception 'Դուք այս խաղի մասնակից չեք'; end if;
  select * into k from game_keys where game_id = p_game;
  v_lim := k.times[p_q + 1] * 1000;
  v_ms := greatest(0, (extract(epoch from (now() - g.started_at)) * 1000)::int);
  if v_ms > v_lim + 1500 then raise exception 'Ժամանակը սպառվեց'; end if;
  v_ms := least(v_ms, v_lim);
  ok := (k.keys[p_q + 1] = p_choice);
  if ok then
    pts := round(1000 * (1 - (v_ms::numeric / v_lim) / 2)) + least(pl.streak, 5) * 100;
  end if;
  insert into answers (game_id, player_id, q, choice, correct, points, ms)
    values (p_game, pl.id, p_q, p_choice, ok, pts, v_ms) returning * into a;
  return a;
exception when unique_violation then
  raise exception 'Դուք արդեն պատասխանել եք';
end $$;

-- Հաղորդավարի գործողություններ
create or replace function host_step(p_game uuid, p_action text) returns games
language plpgsql security definer set search_path = public as $$
declare g games; k game_keys; n int;
begin
  select * into g from games where id = p_game and host = auth.uid();
  if g.id is null then raise exception 'Միայն հաղորդավարը կարող է կառավարել խաղը'; end if;
  select * into k from game_keys where game_id = p_game;
  n := jsonb_array_length(g.questions);
  if p_action = 'next' then
    if g.current + 1 >= n then
      update games set status = 'ended', ended_at = now() where id = p_game returning * into g;
    else
      update games set status = 'question', current = g.current + 1, started_at = now(), revealed = null
        where id = p_game returning * into g;
    end if;
  elsif p_action = 'reveal' and g.status = 'question' then
    -- միավորներ և շարքեր
    update players p set
      score = p.score + coalesce(a.points, 0),
      streak = case when a.correct then p.streak + 1 else 0 end
    from (select pl.id, an.points, an.correct from players pl
          left join answers an on an.player_id = pl.id and an.q = g.current
          where pl.game_id = p_game) a
    where p.id = a.id;
    update games set status = 'reveal', revealed = k.keys[g.current + 1] where id = p_game returning * into g;
  elsif p_action = 'leaderboard' then
    update games set status = 'leaderboard' where id = p_game returning * into g;
  elsif p_action = 'end' then
    update games set status = 'ended', ended_at = now() where id = p_game returning * into g;
  end if;
  return g;
end $$;

-- Պրոֆիլ նոր օգտատիրոջ համար
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(new.is_anonymous, false) then
    insert into profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
    on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Իրական ժամանակ
alter publication supabase_realtime add table games, players;

-- Նկարների պահոց
insert into storage.buckets (id, name, public) values ('images', 'images', true) on conflict do nothing;
create policy img_read on storage.objects for select using (bucket_id = 'images');
create policy img_ins on storage.objects for insert to authenticated with check (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
