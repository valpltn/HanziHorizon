alter table public.user_settings
  add column if not exists listening_exercises boolean not null default false,
  add column if not exists speaking_exercises boolean not null default false;

alter table public.review_events drop constraint if exists review_events_quiz_type_check;
alter table public.review_events add constraint review_events_quiz_type_check
  check (quiz_type in ('multiple-choice', 'reverse-choice', 'pinyin', 'matching', 'cloze', 'dictation', 'character', 'pronunciation', 'flashcard', 'exam'));

alter table public.quiz_attempts drop constraint if exists quiz_attempts_quiz_type_check;
alter table public.quiz_attempts add constraint quiz_attempts_quiz_type_check
  check (quiz_type in ('multiple-choice', 'reverse-choice', 'pinyin', 'matching', 'cloze', 'dictation', 'character', 'pronunciation', 'mixed', 'exam'));
