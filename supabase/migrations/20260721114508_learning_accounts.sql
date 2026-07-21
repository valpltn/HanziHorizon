create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_goal smallint not null default 10 check (daily_goal between 5 and 50),
  active_level smallint not null default 1 check (active_level between 1 and 9),
  show_tones boolean not null default true,
  guest_imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.word_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id text not null check (char_length(word_id) between 1 and 80),
  favorite boolean not null default false,
  mastery smallint not null default 0 check (mastery between 0 and 5),
  repetitions integer not null default 0 check (repetitions >= 0),
  interval_days integer not null default 0 check (interval_days between 0 and 36500),
  due_at timestamptz,
  last_rating text check (last_rating in ('again', 'hard', 'good', 'easy')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, word_id)
);

create table public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id text not null check (char_length(word_id) between 1 and 80),
  rating text not null check (rating in ('again', 'hard', 'good', 'easy')),
  correct boolean not null,
  quiz_type text not null check (quiz_type in ('flashcard', 'multiple-choice', 'reverse-choice', 'pinyin', 'matching', 'cloze', 'dictation', 'character', 'exam')),
  duration_ms integer not null default 0 check (duration_ms between 0 and 86400000),
  created_at timestamptz not null default now()
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('practice', 'exam')),
  quiz_type text not null check (quiz_type in ('mixed', 'multiple-choice', 'reverse-choice', 'pinyin', 'matching', 'cloze', 'dictation', 'character', 'exam')),
  level smallint not null check (level between 1 and 9),
  score integer not null check (score >= 0),
  total integer not null check (total > 0 and score <= total),
  duration_seconds integer not null default 0 check (duration_seconds between 0 and 86400),
  completed_at timestamptz not null default now()
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds between 0 and 86400),
  words_reviewed integer not null default 0 check (words_reviewed >= 0),
  created_at timestamptz not null default now(),
  check (ended_at >= started_at)
);

create index word_progress_due_idx on public.word_progress (user_id, due_at);
create index word_progress_favorite_idx on public.word_progress (user_id, favorite) where favorite;
create index review_events_user_created_idx on public.review_events (user_id, created_at desc);
create index review_events_user_word_idx on public.review_events (user_id, word_id, created_at desc);
create index quiz_attempts_user_completed_idx on public.quiz_attempts (user_id, completed_at desc);
create index study_sessions_user_started_idx on public.study_sessions (user_id, started_at desc);

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.word_progress enable row level security;
alter table public.review_events enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.study_sessions enable row level security;

create policy "profiles_owner_all" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "user_settings_owner_all" on public.user_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "word_progress_owner_all" on public.word_progress
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "review_events_owner_all" on public.review_events
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "quiz_attempts_owner_all" on public.quiz_attempts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "study_sessions_owner_all" on public.study_sessions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.profiles, public.user_settings, public.word_progress,
  public.review_events, public.quiz_attempts, public.study_sessions from anon;

grant select, insert, update, delete on table public.profiles, public.user_settings,
  public.word_progress, public.review_events, public.quiz_attempts, public.study_sessions to authenticated;

comment on table public.word_progress is 'Per-user Chinese vocabulary progress; vocabulary content remains versioned in the application catalog.';
comment on table public.review_events is 'Immutable learning events used to calculate personal statistics and review history.';
