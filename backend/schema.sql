-- Kah-Prod backend schema (PostgreSQL)

create extension if not exists "uuid-ossp";

create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table artists (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  style text,
  city text,
  bio text,
  tagline text,
  story text,
  quote text,
  photo_url text,
  flagship boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table artist_metrics (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid references artists(id) on delete cascade,
  value text,
  label text
);

create table artist_highlights (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid references artists(id) on delete cascade,
  title text,
  text text
);

create table artist_timeline (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid references artists(id) on delete cascade,
  year text,
  title text,
  description text
);

create table artist_socials (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid references artists(id) on delete cascade,
  platform text,
  url text
);

create table releases (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid references artists(id) on delete set null,
  title text not null,
  type text,
  year text,
  cover_url text,
  audio_url text,
  created_at timestamptz not null default now()
);

create table videos (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid references artists(id) on delete set null,
  title text not null,
  year text,
  thumbnail_url text,
  video_url text,
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default uuid_generate_v4(),
  date_label text,
  title text,
  description text
);

create table socials (
  id uuid primary key default uuid_generate_v4(),
  name text,
  handle text,
  url text,
  description text,
  status text
);

create table site_settings (
  key text primary key,
  value jsonb not null
);

create table contact_settings (
  key text primary key,
  value text not null
);

create table media (
  id uuid primary key default uuid_generate_v4(),
  url text not null,
  type text,
  created_at timestamptz not null default now()
);
