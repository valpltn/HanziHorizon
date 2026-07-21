drop policy if exists "profiles_owner_all" on public.profiles;
drop policy if exists "user_settings_owner_all" on public.user_settings;
drop policy if exists "word_progress_owner_all" on public.word_progress;
drop policy if exists "review_events_owner_all" on public.review_events;
drop policy if exists "quiz_attempts_owner_all" on public.quiz_attempts;
drop policy if exists "study_sessions_owner_all" on public.study_sessions;

create policy "profiles_owner_select" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_owner_insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_owner_update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_owner_delete" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

create policy "user_settings_owner_select" on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_settings_owner_insert" on public.user_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_settings_owner_update" on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_settings_owner_delete" on public.user_settings for delete to authenticated using ((select auth.uid()) = user_id);

create policy "word_progress_owner_select" on public.word_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "word_progress_owner_insert" on public.word_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "word_progress_owner_update" on public.word_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "word_progress_owner_delete" on public.word_progress for delete to authenticated using ((select auth.uid()) = user_id);

create policy "review_events_owner_select" on public.review_events for select to authenticated using ((select auth.uid()) = user_id);
create policy "review_events_owner_insert" on public.review_events for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "review_events_owner_update" on public.review_events for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "review_events_owner_delete" on public.review_events for delete to authenticated using ((select auth.uid()) = user_id);

create policy "quiz_attempts_owner_select" on public.quiz_attempts for select to authenticated using ((select auth.uid()) = user_id);
create policy "quiz_attempts_owner_insert" on public.quiz_attempts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "quiz_attempts_owner_update" on public.quiz_attempts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "quiz_attempts_owner_delete" on public.quiz_attempts for delete to authenticated using ((select auth.uid()) = user_id);

create policy "study_sessions_owner_select" on public.study_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "study_sessions_owner_insert" on public.study_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "study_sessions_owner_update" on public.study_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "study_sessions_owner_delete" on public.study_sessions for delete to authenticated using ((select auth.uid()) = user_id);
