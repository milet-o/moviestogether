-- ============================================================
-- MoviesTogether — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- Automatically created when a user signs up via trigger
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- COUPLE INVITES
-- Short-lived invite codes for pairing users
-- ============================================================
create table if not exists public.couple_invites (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  inviter_id uuid references public.profiles(id) on delete cascade not null,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz default (now() + interval '48 hours') not null,
  created_at timestamptz default now() not null
);

alter table public.couple_invites enable row level security;

create policy "Anyone can create an invite"
  on public.couple_invites for insert
  with check (auth.uid() = inviter_id);

create policy "Anyone authenticated can read invites"
  on public.couple_invites for select
  using (auth.role() = 'authenticated');

create policy "Accepter can update invite"
  on public.couple_invites for update
  using (auth.uid() = accepted_by or accepted_by is null);

-- ============================================================
-- COUPLES
-- The permanent bond between two users
-- ============================================================
create table if not exists public.couples (
  id uuid default gen_random_uuid() primary key,
  user1_id uuid references public.profiles(id) on delete cascade not null,
  user2_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(user1_id, user2_id)
);

alter table public.couples enable row level security;

create policy "Members can view their couple"
  on public.couples for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "Authenticated can create couple"
  on public.couples for insert
  with check (auth.uid() = user1_id or auth.uid() = user2_id);

-- ============================================================
-- WATCHLIST
-- Movies queued to watch together
-- ============================================================
create table if not exists public.watchlist (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid references public.couples(id) on delete cascade not null,
  added_by uuid references public.profiles(id) on delete set null,
  imdb_id text not null,
  title text not null,
  poster_url text,
  year text,
  genre text,
  plot text,
  imdb_rating text,
  position int default 0,
  created_at timestamptz default now() not null,
  unique(couple_id, imdb_id)
);

alter table public.watchlist enable row level security;

create policy "Couple members can read watchlist"
  on public.watchlist for select
  using (
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Couple members can add to watchlist"
  on public.watchlist for insert
  with check (
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Couple members can update watchlist"
  on public.watchlist for update
  using (
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Couple members can delete from watchlist"
  on public.watchlist for delete
  using (
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

-- ============================================================
-- WATCHED
-- Movies the couple has already seen
-- ============================================================
create table if not exists public.watched (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid references public.couples(id) on delete cascade not null,
  marked_by uuid references public.profiles(id) on delete set null,
  imdb_id text not null,
  title text not null,
  poster_url text,
  year text,
  genre text,
  plot text,
  imdb_rating text,
  watched_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  unique(couple_id, imdb_id)
);

alter table public.watched enable row level security;

create policy "Couple members can read watched"
  on public.watched for select
  using (
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Couple members can insert watched"
  on public.watched for insert
  with check (
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Couple members can update watched"
  on public.watched for update
  using (
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Couple members can delete watched"
  on public.watched for delete
  using (
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

-- ============================================================
-- REVIEWS
-- Individual ratings per watched movie
-- ============================================================
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  watched_id uuid references public.watched(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rating int check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(watched_id, user_id)
);

alter table public.reviews enable row level security;

create policy "Couple members can read reviews"
  on public.reviews for select
  using (
    watched_id in (
      select w.id from public.watched w
      join public.couples c on c.id = w.couple_id
      where c.user1_id = auth.uid() or c.user2_id = auth.uid()
    )
  );

create policy "User can insert their own review"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "User can update their own review"
  on public.reviews for update
  using (auth.uid() = user_id);

create policy "User can delete their own review"
  on public.reviews for delete
  using (auth.uid() = user_id);

-- ============================================================
-- REALTIME
-- Enable realtime for live updates
-- ============================================================
alter publication supabase_realtime add table public.watchlist;
alter publication supabase_realtime add table public.watched;
alter publication supabase_realtime add table public.reviews;
