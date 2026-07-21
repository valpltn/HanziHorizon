drop policy if exists "profiles_owner_select" on public.profiles;
drop policy if exists "profiles_owner_insert" on public.profiles;
drop policy if exists "profiles_owner_update" on public.profiles;
drop policy if exists "profiles_owner_delete" on public.profiles;

alter table public.profiles rename column id to user_id;

create policy "profiles_owner_select" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles_owner_insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profiles_owner_update" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "profiles_owner_delete" on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);
