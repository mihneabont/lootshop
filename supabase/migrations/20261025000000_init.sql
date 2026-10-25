-- Loot Shop giveaways: core schema, row-level security and the winner draw.

create extension if not exists pgcrypto with schema extensions;

create type public.giveaway_status as enum ('draft', 'open', 'closed', 'drawn');
create type public.win_status as enum ('pending', 'contacted', 'claimed', 'forfeited');

-- Profiles ------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  notifications_opt_in boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- A profile row is created for every new account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the profile email in sync when a user changes it.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- Web push subscriptions (one per browser or installed app) ---------------

create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text,
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Giveaways -----------------------------------------------------------------

create table public.giveaways (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  image_url text,
  product_url text,
  wc_product_id bigint,
  retail_price_ron numeric(10, 2) not null check (retail_price_ron > 0),
  giveaway_price_ron numeric(10, 2) not null check (giveaway_price_ron >= 0),
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  status public.giveaway_status not null default 'draft',
  entry_count integer not null default 0,
  winner_display text,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  check (closes_at > opens_at),
  check (giveaway_price_ron < retail_price_ron)
);

create index giveaways_status_opens_idx on public.giveaways (status, opens_at desc);

-- Entries -------------------------------------------------------------------

create table public.entries (
  giveaway_id uuid not null references public.giveaways (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (giveaway_id, user_id)
);

create index entries_user_idx on public.entries (user_id);

create or replace function public.update_entry_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.giveaways set entry_count = entry_count + 1 where id = new.giveaway_id;
  else
    update public.giveaways set entry_count = greatest(entry_count - 1, 0) where id = old.giveaway_id;
  end if;
  return null;
end;
$$;

create trigger entries_count
  after insert or delete on public.entries
  for each row execute function public.update_entry_count();

-- Draws and wins ------------------------------------------------------------

-- Every draw is logged and never edited, so any result can be shown to be fair.
create table public.draws (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways (id) on delete cascade,
  winner_id uuid references public.profiles (id) on delete set null,
  eligible_count integer not null,
  random_value text not null,
  winning_index integer not null,
  drawn_by uuid references public.profiles (id) on delete set null,
  drawn_at timestamptz not null default now()
);

create table public.wins (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways (id) on delete cascade,
  draw_id uuid not null references public.draws (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  status public.win_status not null default 'pending',
  coupon_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one live (not forfeited) win per giveaway.
create unique index wins_one_active_per_giveaway
  on public.wins (giveaway_id)
  where status <> 'forfeited';

-- Messages between the admin and a user ----------------------------------

-- Each user has one conversation with the shop, keyed by user_id.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  from_admin boolean not null,
  giveaway_id uuid references public.giveaways (id) on delete set null,
  title text,
  body text not null check (length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_user_created_idx on public.messages (user_id, created_at desc);

-- Draw ----------------------------------------------------------------------

-- Picks one eligible entry with a cryptographically secure random number.
-- Users who already forfeited this giveaway are excluded, so the same
-- function handles redraws.
create or replace function public.draw_winner(p_giveaway_id uuid)
returns public.wins
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_giveaway public.giveaways;
  v_count integer;
  v_random bigint;
  v_index integer;
  v_winner uuid;
  v_name text;
  v_draw_id uuid;
  v_win public.wins;
begin
  if not public.is_admin() then
    raise exception 'only the admin can draw a winner' using errcode = '42501';
  end if;

  select * into v_giveaway from public.giveaways where id = p_giveaway_id for update;
  if not found then
    raise exception 'giveaway not found';
  end if;
  if v_giveaway.status = 'draft' then
    raise exception 'giveaway has not been published';
  end if;
  if exists (
    select 1 from public.wins where giveaway_id = p_giveaway_id and status <> 'forfeited'
  ) then
    raise exception 'giveaway already has a winner; forfeit it before redrawing';
  end if;

  select count(*) into v_count
  from public.entries e
  where e.giveaway_id = p_giveaway_id
    and not exists (
      select 1 from public.wins w
      where w.giveaway_id = p_giveaway_id and w.user_id = e.user_id
    );

  if v_count = 0 then
    raise exception 'no eligible entries';
  end if;

  -- 48 random bits, always positive as a bigint.
  v_random := ('x' || encode(extensions.gen_random_bytes(6), 'hex'))::bit(48)::bigint;
  v_index := (v_random % v_count)::integer;

  select e.user_id into v_winner
  from public.entries e
  where e.giveaway_id = p_giveaway_id
    and not exists (
      select 1 from public.wins w
      where w.giveaway_id = p_giveaway_id and w.user_id = e.user_id
    )
  order by e.created_at, e.user_id
  offset v_index
  limit 1;

  insert into public.draws (giveaway_id, winner_id, eligible_count, random_value, winning_index, drawn_by)
  values (p_giveaway_id, v_winner, v_count, to_hex(v_random), v_index, auth.uid())
  returning id into v_draw_id;

  insert into public.wins (giveaway_id, draw_id, user_id)
  values (p_giveaway_id, v_draw_id, v_winner)
  returning * into v_win;

  -- Public label: first name and last initial, e.g. "Andrei P."
  select
    case
      when position(' ' in trim(coalesce(display_name, ''))) > 0 then
        split_part(trim(display_name), ' ', 1) || ' ' ||
        left(split_part(trim(display_name), ' ', array_length(string_to_array(trim(display_name), ' '), 1)), 1) || '.'
      else coalesce(nullif(trim(display_name), ''), 'Câștigător')
    end
  into v_name
  from public.profiles where id = v_winner;

  update public.giveaways
  set status = 'drawn', winner_display = v_name
  where id = p_giveaway_id;

  return v_win;
end;
$$;

revoke execute on function public.draw_winner(uuid) from public, anon;
grant execute on function public.draw_winner(uuid) to authenticated;

-- Forfeits the live win so the admin can redraw.
create or replace function public.forfeit_win(p_win_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'only the admin can forfeit a win' using errcode = '42501';
  end if;
  update public.wins set status = 'forfeited', updated_at = now() where id = p_win_id;
  update public.giveaways g
  set status = 'closed', winner_display = null
  from public.wins w
  where w.id = p_win_id and g.id = w.giveaway_id;
end;
$$;

revoke execute on function public.forfeit_win(uuid) from public, anon;
grant execute on function public.forfeit_win(uuid) to authenticated;

-- Row-level security --------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.giveaways enable row level security;
alter table public.entries enable row level security;
alter table public.draws enable row level security;
alter table public.wins enable row level security;
alter table public.messages enable row level security;

-- Profiles: users see and edit their own; the admin sees all.
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Users may only change these columns; role stays out of reach.
revoke update on public.profiles from authenticated, anon;
grant update (display_name, notifications_opt_in) on public.profiles to authenticated;

-- Push subscriptions: users manage their own.
create policy "push_subscriptions: own" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Giveaways: anyone, signed in or not, sees published ones; the admin manages all.
create policy "giveaways: read published" on public.giveaways
  for select to anon, authenticated
  using (status <> 'draft' or public.is_admin());

create policy "giveaways: admin insert" on public.giveaways
  for insert to authenticated
  with check (public.is_admin());

create policy "giveaways: admin update" on public.giveaways
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "giveaways: admin delete" on public.giveaways
  for delete to authenticated
  using (public.is_admin() and status = 'draft');

-- Entries: free, one per user, only while the giveaway is open.
create policy "entries: read own or admin" on public.entries
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "entries: enter open giveaway" on public.entries
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.giveaways g
      where g.id = giveaway_id
        and g.status = 'open'
        and now() >= g.opens_at
        and now() < g.closes_at
    )
  );

-- Draws: admin only. The public result is giveaways.winner_display.
create policy "draws: admin read" on public.draws
  for select to authenticated
  using (public.is_admin());

-- Wins: the winner sees their own; the admin sees and updates all.
create policy "wins: read own or admin" on public.wins
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "wins: admin update" on public.wins
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Messages: a user reads and writes their own conversation; the admin all.
create policy "messages: read own or admin" on public.messages
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "messages: user writes own" on public.messages
  for insert to authenticated
  with check (
    (user_id = auth.uid() and from_admin = false)
    or public.is_admin()
  );

create policy "messages: mark read" on public.messages
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

revoke update on public.messages from authenticated, anon;
grant update (read_at) on public.messages to authenticated;

-- Realtime for the in-app conversation.
alter publication supabase_realtime add table public.messages;
