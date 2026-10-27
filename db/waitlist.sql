-- The members' waitlist (api/join-waitlist.ts writes it). Run once on each Neon branch, e.g. in the Neon SQL editor.
-- Safe to run again: it only creates what's missing and redefines the view.

create table if not exists waitlist_signups (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Lowercased
  email text not null,
  first_name text not null,
  -- As the member typed them
  gym_name text not null,
  city text not null,
  -- Gym and city, normalized: sign-ups are counted per key. Set two keys to the same value to merge spellings
  gym_key text not null,
  -- The member agreed that we may tell their gym their first name
  share_name boolean not null default false,
  -- The page's "?src=" (e.g. flyer, or share for the link members pass on) and where the popup was opened
  source text,
  page text,
  -- Set once the member confirms their email (not built yet)
  confirmed_at timestamptz,
  unique (email, gym_key)
);

-- One row per gym: what we bring to that gym. Only first names of members who agreed, and only the first word of each
create or replace view waitlist_by_gym as
select
  gym_key,
  mode() within group (order by gym_name) as gym,
  mode() within group (order by city) as city,
  count(*) as signups,
  count(confirmed_at) as confirmed,
  string_agg(split_part(first_name, ' ', 1), ', ' order by created_at) filter (where share_name) as names_shared,
  max(created_at) as last_signup
from waitlist_signups
group by gym_key;
