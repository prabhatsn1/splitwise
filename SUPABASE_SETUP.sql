-- ============================================================================
-- Supabase SQL Schema for Splitwise App
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- ── Users ──────────────────────────────────────────────────────────────────────

create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  user_id    text unique not null,
  name       text not null,
  email      text unique not null,
  phone      text,
  avatar     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users enable row level security;

create policy "Users can read own profile"
  on users for select using (auth.uid() = id);

create policy "Users can insert own profile"
  on users for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on users for update using (auth.uid() = id);

-- Allow reading other users by email/id for friend lookups
create policy "Users can read others by email"
  on users for select using (true);

-- ── Friendships ────────────────────────────────────────────────────────────────

create table if not exists friendships (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  friend_id     text not null,
  friend_name   text not null,
  friend_email  text not null,
  friend_phone  text,
  friend_avatar text,
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  unique (user_id, friend_id)
);

alter table friendships enable row level security;

create policy "Users manage own friendships"
  on friendships for all using (auth.uid()::text = user_id);

-- Also allow reading friendships where you're the friend
create policy "Users can see friendships targeting them"
  on friendships for select using (auth.uid()::text = friend_id);

-- ── Invitations ────────────────────────────────────────────────────────────────

create table if not exists invitations (
  id             uuid primary key default gen_random_uuid(),
  from_user_id   text not null,
  from_user_name text not null,
  to_phone       text not null,
  to_name        text not null,
  status         text not null default 'pending',
  created_at     timestamptz not null default now(),
  responded_at   timestamptz,
  message        text
);

alter table invitations enable row level security;

create policy "Users manage own invitations"
  on invitations for all using (auth.uid()::text = from_user_id);

-- ── Expenses ───────────────────────────────────────────────────────────────────

create table if not exists expenses (
  id            uuid primary key default gen_random_uuid(),
  expense_id    text unique not null,
  description   text not null,
  amount        numeric(12, 2) not null,
  currency      text not null default 'USD',
  paid_by       jsonb not null,
  split_between jsonb not null default '[]'::jsonb,
  split_type    text not null default 'equal',
  splits        jsonb not null default '[]'::jsonb,
  category      text not null default 'Other',
  date          timestamptz not null default now(),
  group_id      text,
  receipt       text,
  location      jsonb,
  recurring     jsonb,
  tags          jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  owner_id      text not null
);

alter table expenses enable row level security;

-- Owner full access
create policy "Expense owner full access"
  on expenses for all using (auth.uid()::text = owner_id);

-- Participants can read expenses they're part of
create policy "Participants can read expenses"
  on expenses for select using (
    split_between @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text))
    or paid_by->>'id' = auth.uid()::text
  );

-- ── Groups ─────────────────────────────────────────────────────────────────────

create table if not exists groups (
  id             uuid primary key default gen_random_uuid(),
  group_id       text unique not null,
  name           text not null,
  description    text,
  members        jsonb not null default '[]'::jsonb,
  created_by     text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  simplify_debts boolean not null default true,
  owner_id       text not null
);

alter table groups enable row level security;

-- Owner full access
create policy "Group owner full access"
  on groups for all using (auth.uid()::text = owner_id);

-- Members can read groups they belong to
create policy "Members can read groups"
  on groups for select using (
    members @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text))
  );

-- Members can update groups (e.g. add members, rename)
create policy "Members can update groups"
  on groups for update using (
    members @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text))
  );

-- ── Settlements ────────────────────────────────────────────────────────────────

create table if not exists settlements (
  id             uuid primary key default gen_random_uuid(),
  settlement_id  text unique not null,
  from_user_id   text not null,
  to_user_id     text not null,
  amount         numeric(12, 2) not null,
  currency       text not null default 'USD',
  payment_method text not null default 'cash',
  date           timestamptz not null default now(),
  note           text,
  group_id       text,
  created_at     timestamptz not null default now(),
  owner_id       text not null
);

alter table settlements enable row level security;

create policy "Settlement owner full access"
  on settlements for all using (auth.uid()::text = owner_id);

create policy "Settlement counterparty can read"
  on settlements for select using (
    auth.uid()::text = from_user_id or auth.uid()::text = to_user_id
  );

-- ── Indexes ────────────────────────────────────────────────────────────────────

create index if not exists idx_expenses_owner   on expenses (owner_id);
create index if not exists idx_expenses_group   on expenses (group_id);
create index if not exists idx_groups_owner     on groups (owner_id);
create index if not exists idx_settlements_from on settlements (from_user_id);
create index if not exists idx_settlements_to   on settlements (to_user_id);
create index if not exists idx_friendships_user on friendships (user_id);
create index if not exists idx_invitations_from on invitations (from_user_id);

-- ── Updated-at trigger ─────────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on users
  for each row execute function update_updated_at();

create trigger set_updated_at before update on expenses
  for each row execute function update_updated_at();

create trigger set_updated_at before update on groups
  for each row execute function update_updated_at();

-- ── Realtime ───────────────────────────────────────────────────────────────────
-- Enable Realtime publication for live cross-user sync.
-- Run these once in the Supabase SQL Editor.

alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table groups;
alter publication supabase_realtime add table settlements;

