create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  phone text not null
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  medicine text not null,
  time text not null,
  dosage text not null,
  quantity integer not null
);

create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  status text not null check (status in ('taken', 'later', 'skip')),
  timestamp timestamptz not null default now()
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('sos', 'missed', 'inactivity')),
  message text not null,
  timestamp timestamptz not null default now()
);
